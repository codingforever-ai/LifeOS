import { db, tx } from './db.mjs';
import { ENTITIES, READONLY_VIA_API, titleOf } from './schema.mjs';
import { HttpError, all, create, getRaw, getSettings, hydrate, list, logActivity, saveSettings, uid, update, userTz } from './crud.mjs';
import { rows } from './derive.mjs';

/* ---------------- focus sessions (server-authoritative clock: survives backgrounded tabs & reloads) ---------------- */
const nowIso = () => new Date().toISOString();
export function focusStart(userId, body) {
  const live = rows(userId, 'focus_sessions', "status IN ('running','paused')")[0];
  if (live) throw new HttpError(409, 'A focus session is already in progress. Finish it first.', { session: live.id });
  const t = nowIso();
  let domain = body.domain ?? null;
  if (!domain && body.task_id) domain = rows(userId, 'tasks', 'id = ?', body.task_id)[0]?.domain ?? null;
  if (!domain && body.project_id) domain = rows(userId, 'projects', 'id = ?', body.project_id)[0]?.domain ?? null;
  return create(userId, 'focus_sessions', { task_id: body.task_id, project_id: body.project_id, goal_id: body.goal_id, note: body.note, planned_min: body.planned_min, domain, started_at: t, running_since: t, accumulated_ms: 0, status: 'running' }, { allowSystem: true });
}
function liveSession(userId, id) {
  const r = getRaw(userId, 'focus_sessions', id);
  if (!r) throw new HttpError(404, 'Session not found');
  return r;
}
export function focusAction(userId, id, action, body = {}) {
  return tx(() => {
    const s = liveSession(userId, id); const now = Date.now(); const t = nowIso();
    const elapsed = s.running_since ? now - new Date(s.running_since).getTime() : 0;
    if (action === 'pause') {
      if (s.status !== 'running') throw new HttpError(409, 'Session is not running');
      db.prepare('UPDATE focus_sessions SET accumulated_ms = ?, running_since = NULL, status = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(s.accumulated_ms + elapsed, 'paused', t, id, userId);
    } else if (action === 'resume') {
      if (s.status !== 'paused') throw new HttpError(409, 'Session is not paused');
      db.prepare('UPDATE focus_sessions SET running_since = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(t, 'running', t, id, userId);
    } else if (action === 'complete' || action === 'stop') {
      if (!['running', 'paused'].includes(s.status)) throw new HttpError(409, 'Session already finished');
      const total = s.accumulated_ms + elapsed; const status = action === 'complete' ? 'completed' : 'stopped';
      db.prepare('UPDATE focus_sessions SET accumulated_ms = ?, running_since = NULL, ended_at = ?, status = ?, updated_at = ?, note = COALESCE(?, note) WHERE id = ? AND user_id = ?').run(total, t, status, t, typeof body.note === 'string' ? body.note.slice(0, 2000) : null, id, userId);
      if (s.task_id) db.prepare('UPDATE tasks SET actual_min = COALESCE(actual_min, 0) + ?, updated_at = ? WHERE id = ? AND user_id = ?').run(Math.round(total / 60000), t, s.task_id, userId);
      logActivity(userId, 'focus_sessions', id, 'completed', { title: `Focus ${Math.round(total / 60000)} min`, domain: s.domain }, {});
    } else throw new HttpError(400, 'Unknown action');
    return hydrate('focus_sessions', getRaw(userId, 'focus_sessions', id));
  });
}

/* ---------------- experiments ---------------- */
export function experimentAction(userId, id, action, body = {}) {
  const e = getRaw(userId, 'experiments', id); if (!e) throw new HttpError(404, 'Experiment not found');
  if (action === 'start') { if (e.status !== 'draft') throw new HttpError(409, 'Only draft experiments can start'); return update(userId, 'experiments', id, { status: 'running', started_at: nowIso() }, { allowSystem: true }); }
  if (action === 'complete') return update(userId, 'experiments', id, { status: 'completed', conclusion: body.conclusion });
  if (action === 'archive') return update(userId, 'experiments', id, { status: 'archived' });
  throw new HttpError(400, 'Unknown action');
}
export function experimentResults(userId, id) {
  const e = getRaw(userId, 'experiments', id); if (!e) throw new HttpError(404, 'Experiment not found');
  const exp = hydrate('experiments', e); const obs = rows(userId, 'experiment_observations', 'experiment_id = ?', id);
  const tz = userTz(userId);
  const start = exp.started_at ? new Date(exp.started_at) : null; const end = start ? new Date(start.getTime() + exp.duration_days * 864e5) : null;
  const sessions = start ? rows(userId, 'focus_sessions', "started_at >= ? AND started_at < ? AND status IN ('completed','stopped')", start.toISOString(), (end < new Date() ? end : new Date()).toISOString()) : [];
  const done = start ? rows(userId, 'tasks', 'done_at >= ? AND done_at < ?', start.toISOString(), (end < new Date() ? end : new Date()).toISOString()) : [];
  const byMeasure = {};
  for (const o of obs) if (o.value !== null) (byMeasure[o.measure || 'value'] ??= []).push(o.value);
  void tz;
  return {
    experiment: exp, daysElapsed: start ? Math.min(exp.duration_days, Math.floor((Date.now() - start.getTime()) / 864e5) + 1) : 0, ends: end?.toISOString() ?? null,
    measured: { focusMinutes: Math.round(sessions.reduce((s, x) => s + x.accumulated_ms / 60000, 0)), focusSessions: sessions.length, tasksCompleted: done.length },
    observations: obs.length, series: Object.fromEntries(Object.entries(byMeasure).map(([k, v]) => [k, { n: v.length, mean: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v) }])),
    note: 'Results describe what happened during the experiment window. They are evidence, not proof.',
  };
}

/* ---------------- universal search ---------------- */
const SEARCH = ['tasks', 'goals', 'projects', 'milestones', 'deadlines', 'events', 'notes', 'memories', 'decisions', 'reviews', 'accomplishments', 'subjects', 'topics', 'exams', 'assignments', 'study_resources', 'clients', 'deliverables', 'programs', 'finance_items', 'personal_items', 'inbox'];
const GROUP = { subjects: 'Study', topics: 'Study', study_resources: 'Study', exams: 'Academic', assignments: 'Academic', clients: 'Work', deliverables: 'Work', programs: 'Fitness', finance_items: 'Finance', personal_items: 'Personal' };
export function searchAll(userId, q, { types, sort = 'relevance', limit = 8 } = {}) {
  q = String(q ?? '').trim();
  if (q.length < 1) return { q, groups: [], total: 0 };
  const wanted = types ? String(types).split(',').filter((t) => SEARCH.includes(t)) : SEARCH;
  const groups = [];
  for (const entity of wanted) {
    const r = list(userId, entity, { q, limit: Math.min(limit, 20), sort: sort === 'recent' ? 'updated_at:desc' : undefined });
    if (!r.items.length) continue;
    const ql = q.toLowerCase();
    const items = r.items.map((x) => {
      const title = String(titleOf(entity, x)); const exact = title.toLowerCase().includes(ql);
      const sub = x.due_at ?? x.start_at ?? x.exam_at ?? x.achieved_on ?? x.period_start ?? x.status ?? x.kind ?? null;
      return { id: x.id, entity, title: title.slice(0, 160), sub, domain: x.domain ?? GROUP[entity]?.toLowerCase() ?? null, updated_at: x.updated_at, score: exact ? 1 : 0 };
    });
    if (sort === 'relevance') items.sort((a, b) => b.score - a.score);
    groups.push({ entity, label: ENTITIES[entity].label, area: GROUP[entity] ?? 'Core', total: r.total, items });
  }
  return { q, groups, total: groups.reduce((s, g) => s + g.total, 0), semantic: false };
}
export function rememberSearch(userId, q) {
  const s = getSettings(userId); const t = String(q ?? '').trim().slice(0, 80); if (!t) return;
  saveSettings(userId, { recentSearches: [t, ...s.recentSearches.filter((x) => x !== t)].slice(0, 8) });
}

/* ---------------- timeline ---------------- */
export function timeline(userId, { from, to, domain, entity, entityId, limit = 100, offset = 0 } = {}) {
  const where = ['user_id = ?']; const p = [userId];
  if (from) { where.push('at >= ?'); p.push(from); } if (to) { where.push('at < ?'); p.push(to); }
  if (entityId) { where.push('entity_id = ?'); p.push(entityId); }
  if (domain) { where.push('domain = ?'); p.push(domain); } if (entity) { where.push('entity = ?'); p.push(entity); }
  const lim = Math.min(Number(limit) || 100, 300); const off = Math.max(Number(offset) || 0, 0);
  const total = db.prepare(`SELECT COUNT(*) c FROM activity WHERE ${where.join(' AND ')}`).get(...p).c;
  const items = db.prepare(`SELECT id, entity, entity_id, action, title, domain, at, actor FROM activity WHERE ${where.join(' AND ')} ORDER BY at DESC LIMIT ${lim} OFFSET ${off}`).all(...p);
  return { items, total, limit: lim, offset: off };
}

/* ---------------- inbox triage ---------------- */
export function inboxConvert(userId, id, as, extra = {}) {
  return tx(() => {
    const item = getRaw(userId, 'inbox', id); if (!item) throw new HttpError(404, 'Capture not found');
    const title = String(item.content).split('\n')[0].slice(0, 200);
    let rec;
    if (as === 'task') rec = create(userId, 'tasks', { title, notes: item.content.length > title.length ? item.content : undefined, ...extra });
    else if (as === 'note') rec = create(userId, 'notes', { title, body: item.content, ...extra });
    else if (as === 'deadline') rec = create(userId, 'deadlines', { title, due_at: extra.due_at, ...extra });
    else if (as === 'project') rec = create(userId, 'projects', { title, ...extra });
    else if (as === 'goal') rec = create(userId, 'goals', { title, ...extra });
    else if (as === 'memory') rec = create(userId, 'memories', { content: item.content, ...extra });
    else if (as === 'dismiss') { update(userId, 'inbox', id, { status: 'dismissed' }); return { dismissed: true }; }
    else throw new HttpError(400, 'Cannot convert to that type');
    update(userId, 'inbox', id, { status: 'processed', resolved_type: as, resolved_id: rec.id });
    return rec;
  });
}

/* ---------------- export / import ---------------- */
export function exportAll(userId) {
  const data = { app: 'lifeos', version: 1, exported_at: nowIso(), user: db.prepare('SELECT id,email,name,created_at FROM users WHERE id = ?').get(userId), settings: getSettings(userId), entities: {} };
  for (const name of Object.keys(ENTITIES)) data.entities[name] = db.prepare(`SELECT * FROM ${name} WHERE user_id = ?`).all(userId).map((r) => hydrate(name, r));
  data.activity = db.prepare('SELECT * FROM activity WHERE user_id = ? ORDER BY at').all(userId).map(({ user_id, ...r }) => r);
  return data;
}
export function importAll(userId, payload) {
  if (!payload || payload.app !== 'lifeos' || typeof payload.entities !== 'object') throw new HttpError(400, 'This file is not a LifeOS export');
  const skip = new Set([...READONLY_VIA_API, 'alerts']);
  const names = Object.keys(ENTITIES).filter((n) => !skip.has(n));
  const order = []; const seen = new Set();
  const visit = (n) => { if (seen.has(n) || !names.includes(n)) return; seen.add(n); for (const f of Object.values(ENTITIES[n].fields)) if (f.t === 'ref' && f.to !== n) visit(f.to); order.push(n); };
  names.forEach(visit);
  const idMap = new Map(); const counts = {}; let total = 0;
  tx(() => {
    for (const n of order) {
      const rowsIn = Array.isArray(payload.entities[n]) ? payload.entities[n] : [];
      for (const row of rowsIn) {
        if (++total > 20000) throw new HttpError(413, 'Import too large');
        const body = {};
        let ok = true;
        for (const [k, f] of Object.entries(ENTITIES[n].fields)) {
          let v = row[k]; if (v === undefined || v === null) continue;
          if (f.t === 'ref') { v = idMap.get(`${f.to}:${v}`); if (!v) { if (f.req) ok = false; continue; } }
          body[k] = v;
        }
        if (!ok) continue;
        try {
          const rec = create(userId, n, body, { allowSystem: true, actor: 'import' });
          idMap.set(`${n}:${row.id}`, rec.id); counts[n] = (counts[n] ?? 0) + 1;
        } catch (e) { if (e.status === 409) continue; throw new HttpError(400, `Import failed on ${n}: ${e.message}`); }
      }
    }
  });
  return { imported: counts };
}

/* ---------------- integrations (framework only — never fakes a connection) ---------------- */
const PROVIDERS = {
  google_calendar: { label: 'Google Calendar', permissions: ['Read events', 'Create and edit events'], env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
  outlook: { label: 'Outlook Calendar', permissions: ['Read events', 'Create and edit events'], env: ['MS_CLIENT_ID', 'MS_CLIENT_SECRET'] },
  gmail: { label: 'Gmail', permissions: ['Read message metadata'], env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
  google_drive: { label: 'Google Drive', permissions: ['Read files you choose'], env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
};
export function integrations(userId) {
  const saved = new Map(db.prepare('SELECT * FROM integrations WHERE user_id = ?').all(userId).map((r) => [r.provider, r]));
  return Object.entries(PROVIDERS).map(([provider, p]) => {
    const configured = p.env.every((k) => !!process.env[k]); const s = saved.get(provider);
    return { provider, label: p.label, permissions: p.permissions, configured, status: s?.status ?? 'disconnected', last_sync_at: s?.last_sync_at ?? null, error: s?.error ?? null,
      note: configured ? 'Provider credentials are present, but the OAuth connection flow has not been implemented yet.' : `Not available: the server has no ${p.env.join(' / ')} configured.` };
  });
}
export function integrationConnect(provider) {
  if (!PROVIDERS[provider]) throw new HttpError(404, 'Unknown integration');
  const p = PROVIDERS[provider];
  if (!p.env.every((k) => !!process.env[k])) throw new HttpError(501, `${p.label} can’t be connected: the server has no provider credentials configured.`);
  throw new HttpError(501, `${p.label} credentials are configured, but the OAuth flow is not implemented yet. Nothing was connected.`);
}
export function integrationDisconnect(userId, provider) {
  if (!PROVIDERS[provider]) throw new HttpError(404, 'Unknown integration');
  db.prepare("UPDATE integrations SET status = 'disconnected', error = NULL WHERE user_id = ? AND provider = ?").run(userId, provider);
  return integrations(userId).find((i) => i.provider === provider);
}
void uid; void all;
