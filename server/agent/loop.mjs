/**
 * Agent loop: message → context retrieval → model reasoning → tool selection → tool execution →
 * result verification → response. Mutations of existing data are PROPOSED, never silently applied.
 */
import { db, tx } from '../db.mjs';
import { HttpError, all, create, get, getSettings, hydrate, getRaw, update, userTz, archive, logActivity } from '../crud.mjs';
import { dayKey, startOfDay, addDays } from '../tz.mjs';
import { capacity, rows } from '../derive.mjs';
import { getProvider } from './provider.mjs';
import { ALLOWED_IN_BATCH, TOOLS, describeOp, executeVerified, toolByName, toolDefs } from './tools.mjs';

const MAX_STEPS = 8;
const DAILY_LIMIT = Number(process.env.AGENT_DAILY_LIMIT || 150); // future subscription tiers plug in here — CRUD is never limited
const trunc = (s, n) => (String(s).length > n ? `${String(s).slice(0, n)}…` : String(s));

export function agentStatus(userId) {
  const d = getProvider().describe(); const used = usedToday(userId);
  return { configured: d.configured, provider: d.provider, model: d.configured ? d.model : null, enabled: getSettings(userId).agent.enabled, quota: { used, limit: DAILY_LIMIT }, tools: TOOLS.map((t) => ({ name: t.name, risk: t.risk })) };
}
function usedToday(userId) {
  const since = startOfDay(dayKey(new Date(), userTz(userId)), userTz(userId)).toISOString();
  return db.prepare("SELECT COUNT(*) c FROM messages WHERE user_id = ? AND role = 'user' AND created_at >= ?").get(userId, since).c;
}

/** Relevant, compact context — NOT the database. Everything else is fetched on demand through tools. */
function contextSummary(userId) {
  const s = getSettings(userId); const tz = userTz(userId); const now = new Date(); const k = dayKey(now, tz);
  const goals = all(userId, 'goals', { filters: { status: 'active,at_risk' } }).slice(0, 8).map((g) => `${g.title} [${g.id}] (${g.domain}, p${g.priority})`);
  const dl = rows(userId, 'deadlines', "status = 'open'").sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, 6).map((d) => `${d.title} [${d.id}] due ${d.due_at}`);
  const mem = s.privacy.agentUsesMemory ? rows(userId, 'memories').sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, 8).map((m) => `${m.category}: ${trunc(m.content, 160)}`) : [];
  const cap = capacity(userId, k, 1).days[0];
  const open = db.prepare('SELECT COUNT(*) c FROM tasks WHERE user_id = ? AND archived_at IS NULL AND done_at IS NULL').get(userId).c;
  return [
    `Now: ${now.toISOString()} (user local date ${k}, timezone ${tz}, week starts ${['Sun', 'Mon', '', '', '', '', 'Sat'][s.weekStart] ?? 'Mon'}).`,
    `Working hours ${s.workStart}–${s.workEnd} on weekdays [${s.workDays.join(',')}] (0=Sun), buffer ${s.bufferMin} min/day.`,
    `Open tasks: ${open}. Today capacity: available ${cap.available}m, committed ${cap.committed}m, planned ${cap.planned}m, remaining ${cap.remaining}m.`,
    goals.length ? `Active goals: ${goals.join('; ')}` : 'No active goals.', dl.length ? `Next deadlines: ${dl.join('; ')}` : 'No open deadlines.',
    mem.length ? `Memories:\n- ${mem.join('\n- ')}` : '',
  ].filter(Boolean).join('\n');
}

const SYSTEM = `You are the LifeOS Agent — the intelligence layer of a personal life operating system. You help the user capture, understand, plan, act, measure, reflect and learn across ALL life domains (Study, Academic, Work, Fitness, Finance, Personal) using shared tasks, goals, projects, milestones, deadlines, calendar, focus, habits and capacity.

Rules you must follow:
1. Ground every claim in tool results. Never invent tasks, ids, dates or numbers. If you need data, call a read tool. Ids come from read tools only.
2. For planning requests ("fix my week", "plan my week", "prepare tomorrow", "move things so I can finish X by Friday", cross-domain schedules): read calendar, deadlines, tasks, goals/projects and capacity FIRST, identify conflicts and overload, then build ONE realistic plan that respects working hours, existing commitments and buffer. Propose changes using modify/create tools (or reorganize_plan for a batch). Do not claim anything has changed — changes you request are queued as a proposal the user must approve.
3. Existing records are only changed after the user approves. Creating new records may happen directly. Destructive deletion needs strong confirmation: prefer archive_item.
4. After your tool calls, answer concisely: what you found, what you propose and why. If any tool failed, say exactly what failed and what (if anything) changed. Never say "done" for something that was only proposed.
5. Be calm and non-judgmental about workload. No gamification, no scores, no shaming. Distinguish observations from conclusions and mention sample size/confidence for patterns.
6. Dates: use ISO-8601 with offset or local "YYYY-MM-DDTHH:mm" (interpreted in the user's timezone). Respect the working hours and never schedule over existing events.
7. Use create_memory only when the user explicitly asks you to remember something or states a stable preference.
8. Study works without you; you may operate it via get_domain_data and the normal tools.`;

/** Rebuild model-visible history: only user/assistant text (cheap), last N turns. */
function history(userId, conversationId) {
  const msgs = db.prepare("SELECT role, content FROM messages WHERE user_id = ? AND conversation_id = ? AND role IN ('user','assistant') AND content != '' ORDER BY created_at DESC, rowid DESC LIMIT 14").all(userId, conversationId).reverse();
  return msgs.map((m) => ({ role: m.role, content: trunc(m.content, 3000) }));
}
const saveMsg = (userId, conversationId, role, content, extra = {}) => create(userId, 'messages', { conversation_id: conversationId, role, content, ...extra });

export async function runAgent({ user, conversationId, message, emit, signal }) {
  const userId = user.id; const provider = getProvider();
  if (typeof message !== 'string' || !message.trim() || message.length > 4000) throw new HttpError(400, 'Message must be 1–4000 characters');
  if (!getSettings(userId).agent.enabled) throw new HttpError(403, 'The Agent is turned off in Settings → AI / Agent.');
  if (!provider.configured()) throw new HttpError(503, 'The Agent is not configured. The server needs AI_API_KEY (and optionally AI_BASE_URL / AI_MODEL).');
  if (usedToday(userId) >= DAILY_LIMIT) throw new HttpError(429, 'Daily Agent limit reached. Everything else in LifeOS keeps working.');

  let conv;
  if (conversationId) conv = get(userId, 'conversations', conversationId);
  else conv = create(userId, 'conversations', { title: trunc(message.trim().split('\n')[0], 60) });
  const request = message.trim();
  saveMsg(userId, conv.id, 'user', request);
  emit({ type: 'conversation', id: conv.id });

  const messages = [{ role: 'system', content: `${SYSTEM}\n\n## Current context\n${contextSummary(userId)}` }, ...history(userId, conv.id)];
  if (!messages.some((m, i) => i > 0 && m.role === 'user' && m.content === request)) messages.push({ role: 'user', content: request });
  const steps = []; const queued = []; const executed = [];
  const step = (label, status = 'ok', extra = {}) => { const s = { label, status, ...extra }; steps.push(s); emit({ type: 'step', ...s }); return s; };
  step('Retrieving context', 'ok');
  let finalText = ''; let failure = null;

  try {
    for (let i = 0; i < MAX_STEPS; i++) {
      emit({ type: 'thinking' });
      const out = await provider.chat({ messages, tools: toolDefs(), signal });
      if (!out.toolCalls.length) { finalText = out.content; break; }
      messages.push({ role: 'assistant', content: out.content || null, tool_calls: out.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } })) });
      const parsed = out.toolCalls.map((c) => { let args = {}; let err = null; try { args = JSON.parse(c.arguments || '{}'); } catch { err = 'Arguments were not valid JSON'; } return { c, args, err, tool: toolByName(c.name) }; });
      const batchHasConfirm = parsed.some((p) => p.tool && ['confirm', 'strong'].includes(p.tool.risk));
      const confirmCreates = getSettings(userId).agent.confirmCreates;
      for (const { c, args, err, tool } of parsed) {
        let result;
        try {
          if (err) throw new Error(err);
          if (!tool) throw new Error(`Unknown tool "${c.name}"`);
          const queueIt = ['confirm', 'strong'].includes(tool.risk) || (tool.risk === 'safe' && (batchHasConfirm || queued.length > 0 || confirmCreates));
          if (tool.risk === 'read') {
            result = tool.run(userId, args);
            step(labelFor(tool.name), 'ok');
          } else if (queueIt) {
            const ops = tool.name === 'reorganize_plan' ? expandBatch(args) : [{ tool: tool.name, args }];
            for (const op of ops) { validateOp(userId, op); queued.push({ ...op, strong: toolByName(op.tool).risk === 'strong', summary: describeOp(userId, op.tool, op.args) }); }
            result = { queued: true, note: 'Proposed for the user to approve. NOT applied yet.', operations: ops.length };
            step(`Proposed: ${queued.slice(-ops.length).map((o) => o.summary).join('; ')}`, 'proposed');
          } else {
            const r = executeVerified(userId, tool.name, args);
            executed.push({ tool: tool.name, entity: r.entity, id: r.id, op: r.op, before: r.before, after: r.after });
            result = { ok: true, verified: true, id: r.id, title: r.after?.title ?? r.after?.name };
            step(`Created ${r.entity.replace(/_/g, ' ')}: ${trunc(r.after?.title ?? r.after?.name ?? r.id, 60)} (verified)`, 'ok', { entity: r.entity, id: r.id });
          }
        } catch (e) {
          result = { error: e.message, fields: e.fields };
          step(`${tool?.name ?? c.name} failed: ${e.message}`, 'failed');
        }
        messages.push({ role: 'tool', tool_call_id: c.id, content: trunc(JSON.stringify(result), 12000) });
      }
      if (i === MAX_STEPS - 1) finalText = '';
    }
  } catch (e) {
    failure = e; step(e.message, 'failed');
  }

  const total = queued.length;
  let action = null;
  if (total || executed.length) {
    action = create(userId, 'agent_actions', { conversation_id: conv.id, request, status: total ? 'proposed' : 'applied', steps, operations: total ? queued : executed.map((e) => ({ tool: e.tool, args: {}, summary: `${e.op} ${e.entity}` })), result: executed.length ? { executed } : undefined, strong: queued.some((q) => q.strong) }, { actor: 'agent' });
  }
  if (!finalText && !failure) finalText = total ? `I've prepared ${total} change${total > 1 ? 's' : ''} for your approval. Nothing has been changed yet.` : executed.length ? `Created ${executed.length} item${executed.length > 1 ? 's' : ''} (verified).` : 'I could not complete that request within the step limit. Nothing was changed.';
  if (failure) finalText = `${failure.message}${executed.length ? ` Already created before the failure: ${executed.map((e) => e.after?.title ?? e.id).join(', ')}.` : ' Nothing was changed.'}`;
  const msg = saveMsg(userId, conv.id, 'assistant', finalText, { meta: { steps, actionId: action?.id ?? null, failed: !!failure } });
  emit({ type: 'done', conversationId: conv.id, messageId: msg.id, text: finalText, action: action ? publicAction(userId, action.id) : null, failed: !!failure });
  return { conversationId: conv.id };
}

const LABELS = { get_tasks: 'Reading your tasks', get_goals: 'Reading your goals', get_projects: 'Reading your projects', get_milestones: 'Reading milestones', get_deadlines: 'Checking deadlines', get_calendar: 'Reading your calendar', get_habits: 'Checking habits', get_focus_history: 'Reviewing focus history', get_capacity: 'Calculating capacity', get_progress: 'Checking progress', get_patterns: 'Looking for patterns', get_memories: 'Recalling memories', get_decisions: 'Reading decisions', get_reviews: 'Reading reviews', get_domain_data: 'Reading domain data', search_lifeos: 'Searching LifeOS', get_context: 'Tracing related records', analyze_goal_health: 'Analyzing goal health', analyze_project_health: 'Analyzing project health', compare_plan_vs_reality: 'Comparing plan vs reality', analyze_domain_balance: 'Analyzing domain balance', analyze_progress: 'Analyzing progress' };
const labelFor = (n) => LABELS[n] ?? n;

function expandBatch(args) {
  if (!Array.isArray(args.operations) || !args.operations.length || args.operations.length > 40) throw new Error('operations must be 1–40 items');
  return args.operations.map((o) => { if (!ALLOWED_IN_BATCH.has(o.tool)) throw new Error(`Tool ${o.tool} is not allowed in a batch`); return { tool: o.tool, args: o.args ?? {} }; });
}
/** Dry-run validation of a proposed op so bad proposals surface to the model immediately (nothing is written). */
function validateOp(userId, op) {
  const t = toolByName(op.tool); if (!t) throw new Error(`Unknown tool ${op.tool}`);
  const entity = t.entity ?? op.args.entity;
  if (['update', 'complete', 'archive', 'delete'].includes(t.op)) { if (!op.args.id) throw new Error(`${op.tool} needs an id`); get(userId, entity, op.args.id); }
  // Dry-run the real tool inside a transaction that is always rolled back: surfaces validation errors now, writes nothing.
  try { tx(() => { t.run(userId, op.args); throw new DryRun(); }); } catch (e) { if (!(e instanceof DryRun)) throw e; }
}
class DryRun extends Error {}

export function publicAction(userId, id) {
  const a = get(userId, 'agent_actions', id);
  return { id: a.id, request: a.request, status: a.status, strong: a.strong, steps: a.steps ?? [], operations: (a.operations ?? []).map((o) => ({ tool: o.tool, summary: o.summary, strong: !!o.strong })), result: a.result, created_at: a.created_at, conversation_id: a.conversation_id };
}

/** Apply an approved proposal atomically; verify each change by reading it back. All-or-nothing. */
export function applyAction(userId, id, { confirm } = {}) {
  const a = get(userId, 'agent_actions', id);
  if (a.status !== 'proposed') throw new HttpError(409, `This proposal is already ${a.status}.`);
  if (a.strong && confirm !== 'DELETE') throw new HttpError(400, 'This proposal permanently deletes data. Type DELETE to confirm.', { confirm: 'Type DELETE' });
  const ops = a.operations ?? []; const results = [];
  try {
    tx(() => { for (const op of ops) { const r = executeVerified(userId, op.tool, op.args); results.push({ tool: op.tool, summary: op.summary, entity: r.entity, id: r.id, op: r.op, before: r.before, after: r.after, verified: r.verified }); } });
  } catch (e) {
    update(userId, 'agent_actions', id, { status: 'failed', result: { error: e.message, applied: 0 } }, { actor: 'agent' });
    const out = publicAction(userId, id);
    return { ok: false, error: `${e.message} Nothing was changed.`, action: { ...out, status: 'failed' } };
  }
  update(userId, 'agent_actions', id, { status: 'applied', result: { applied: results.length, verified: results.every((r) => r.verified), results } }, { actor: 'agent' });
  logActivity(userId, 'agent_actions', id, 'completed', { title: `Agent applied ${results.length} change(s)` }, { actor: 'agent' });
  return { ok: true, action: publicAction(userId, id), summary: results.map((r) => r.summary), links: results.filter((r) => r.after).map((r) => ({ entity: r.entity, id: r.id, title: r.after.title ?? r.after.name })) };
}

export function rejectAction(userId, id) {
  const a = get(userId, 'agent_actions', id);
  if (a.status !== 'proposed') throw new HttpError(409, `This proposal is already ${a.status}.`);
  update(userId, 'agent_actions', id, { status: 'rejected' }, { actor: 'agent' });
  return publicAction(userId, id);
}

/** Undo where technically safe: updates are restored to their prior values; creations are archived. Deletions cannot be undone. */
export function undoAction(userId, id) {
  const a = get(userId, 'agent_actions', id);
  const res = a.result?.results ?? a.result?.executed;
  if (!['applied'].includes(a.status) || !res) throw new HttpError(409, 'Only applied actions can be undone.');
  if (res.some((r) => r.op === 'delete')) throw new HttpError(409, 'This action permanently deleted data and cannot be undone.');
  tx(() => {
    for (const r of [...res].reverse()) {
      if (r.op === 'create') archive(userId, r.entity, r.id, { actor: 'agent' });
      else if (r.op === 'archive') { /* restore */ db.prepare(`UPDATE ${r.entity} SET archived_at = NULL WHERE id = ? AND user_id = ?`).run(r.id, userId); }
      else if (r.before) {
        const patch = {}; const spec = { ...r.before };
        for (const k of Object.keys(r.after ?? {})) if (JSON.stringify(r.after[k]) !== JSON.stringify(spec[k]) && !['updated_at', 'created_at'].includes(k)) patch[k] = spec[k] ?? null;
        if (Object.keys(patch).length) update(userId, r.entity, r.id, patch, { actor: 'agent', allowSystem: true });
      }
    }
  });
  update(userId, 'agent_actions', id, { status: 'undone' }, { actor: 'agent' });
  return publicAction(userId, id);
}

export function listConversations(userId) { return db.prepare('SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 40').all(userId); }
export function conversationMessages(userId, id) {
  get(userId, 'conversations', id);
  const msgs = db.prepare("SELECT id, role, content, meta, created_at FROM messages WHERE user_id = ? AND conversation_id = ? AND role IN ('user','assistant') ORDER BY created_at, rowid LIMIT 200").all(userId, id);
  return msgs.map((m) => { const meta = m.meta ? JSON.parse(m.meta) : null; return { id: m.id, role: m.role, content: m.content, created_at: m.created_at, steps: meta?.steps ?? [], failed: !!meta?.failed, action: meta?.actionId ? safeAction(userId, meta.actionId) : null }; });
}
const safeAction = (u, id) => { try { return publicAction(u, id); } catch { return null; } };
export function actionHistory(userId) { return db.prepare('SELECT id FROM agent_actions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(userId).map((r) => publicAction(userId, r.id)); }
void hydrate; void getRaw; void addDays;
