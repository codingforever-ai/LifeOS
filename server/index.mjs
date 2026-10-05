import http from 'node:http';
import { migrate, db } from './db.mjs';
import { ENTITIES, READONLY_VIA_API } from './schema.mjs';
import { HttpError, all, archive, complete, create, get, getSettings, getRaw, list, logActivity, remove, reopen, restore, saveSettings, update, userTz } from './crud.mjs';
import { authenticate, changePassword, deleteAccount, friendlyGoogleError, googleFinish, googleStart, login, logout, register, revokeOtherSessions, sessionUser } from './auth.mjs';
import { googleConfigured } from './google.mjs';
import { achievements, alertList, calendarRange, capacity, compass, computeProgress, contextFor, goalHealth, habitsWithStats, patterns, planVsActual, projectHealth, relationshipMap, rows, today, whyBehind } from './derive.mjs';
import { experimentAction, experimentResults, exportAll, focusAction, focusStart, importAll, inboxConvert, integrationConnect, integrationDisconnect, integrations, rememberSearch, searchAll, timeline } from './services.mjs';
import { academicOverview, financeOverview, fitnessOverview, personalOverview, reviewFacts, studyOverview, workOverview } from './domains.mjs';
import { actionHistory, agentStatus, applyAction, conversationMessages, listConversations, publicAction, rejectAction, runAgent, undoAction } from './agent/loop.mjs';
import { saveKey, deleteKey, getKeyInfo, testKey } from './byok.mjs';
import { addDays, dayKey, startOfDay } from './tz.mjs';

migrate();
const PORT = Number(process.env.PORT || 8000);

const routes = [];
const route = (method, path, handler, { auth = true } = {}) => routes.push({ method, re: new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler, auth });

const entityOf = (name) => { if (!ENTITIES[name]) throw new HttpError(404, 'Unknown resource'); return name; };
const writable = (name) => { entityOf(name); if (READONLY_VIA_API.has(name)) throw new HttpError(403, 'This resource is managed by the server'); return name; };
const pdate = (u, v, endOfRange = false) => {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return startOfDay(endOfRange ? addDays(v, 1) : v, userTz(u.id));
  const d = new Date(v); if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid date'); return d;
};

/* ---------- auth ---------- */
route('POST', '/api/auth/register', ({ body, req, res }) => register(body, req, res), { auth: false });
route('POST', '/api/auth/login', ({ body, req, res }) => login(body, req, res), { auth: false });
route('POST', '/api/auth/logout', ({ req, res }) => { logout(req, res); return { ok: true }; }, { auth: false });
route('GET', '/api/auth/me', ({ user }) => sessionUser(user));
route('GET', '/api/auth/google/config', () => ({ configured: googleConfigured() }), { auth: false });
// Google OAuth start: redirects the browser straight to Google's consent screen.
route('GET', '/api/auth/google', ({ query, req, res }) => {
  const url = googleStart(query, req, res);
  res.writeHead(302, { location: url });
  res.end();
  return null; // send() bails — headers already sent
}, { auth: false });
// Google OAuth callback: Google redirects here with ?code=&state=. Exchanges, links/creates user,
// sets the session cookie, then redirects to the app. Always redirects (never JSON).
route('GET', '/api/auth/google/callback', async ({ query, req, res }) => {
  try {
    await googleFinish(query, req, res);
    res.writeHead(302, { location: '/' });
    res.end();
  } catch (e) {
    const msg = encodeURIComponent(friendlyGoogleError(e));
    res.writeHead(302, { location: `/?auth_error=${msg}` });
    res.end();
  }
  return null; // send() bails — headers already sent by the redirect
}, { auth: false });
route('POST', '/api/auth/password', ({ user, body, req, res }) => { changePassword(user, body, req, res); return { ok: true }; });
route('POST', '/api/auth/revoke-others', ({ user, req }) => ({ revoked: revokeOtherSessions(user, req) }));
route('POST', '/api/auth/delete', ({ user, body, res }) => { deleteAccount(user, body, res); return { ok: true }; });
route('GET', '/api/settings', ({ user }) => getSettings(user.id));
route('PATCH', '/api/settings', ({ user, body }) => saveSettings(user.id, body));
route('PATCH', '/api/auth/profile', ({ user, body }) => {
  const name = String(body?.name ?? '').trim(); if (!name || name.length > 80) throw new HttpError(400, 'Enter a name (max 80 characters)', { name: 'Required' });
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id); return sessionUser({ ...user, name });
});

/* ---------- generic entity CRUD (all user-scoped) ---------- */
route('GET', '/api/e/:entity', ({ user, params, query }) => {
  const name = entityOf(params.entity); const filters = {};
  for (const [k, v] of Object.entries(query)) if (k in ENTITIES[name].fields || k === 'id') filters[k] = v;
  return list(user.id, name, { filters, q: query.q, sort: query.sort, limit: query.limit, offset: query.offset, archived: query.archived === '1', range: query.range ? { field: query.range, from: query.from, to: query.to } : undefined });
});
route('POST', '/api/e/:entity', ({ user, params, body }) => create(user.id, writable(params.entity), body));
route('GET', '/api/e/:entity/:id', ({ user, params }) => get(user.id, entityOf(params.entity), params.id));
route('PATCH', '/api/e/:entity/:id', ({ user, params, body }) => update(user.id, writable(params.entity), params.id, body));
route('DELETE', '/api/e/:entity/:id', ({ user, params, query, req }) => {
  const name = writable(params.entity);
  if (query.permanent === '1') { if (req.headers['x-confirm'] !== 'DELETE') throw new HttpError(400, 'Permanent deletion requires strong confirmation'); return remove(user.id, name, params.id); }
  return archive(user.id, name, params.id);
});
route('POST', '/api/e/:entity/:id/complete', ({ user, params }) => complete(user.id, writable(params.entity), params.id));
route('POST', '/api/e/:entity/:id/reopen', ({ user, params }) => reopen(user.id, writable(params.entity), params.id));
route('POST', '/api/e/:entity/:id/restore', ({ user, params }) => restore(user.id, writable(params.entity), params.id));
route('POST', '/api/tasks/bulk', ({ user, body }) => {
  const ids = Array.isArray(body?.ids) ? body.ids.slice(0, 200) : []; if (!ids.length) throw new HttpError(400, 'No tasks selected');
  const out = [];
  db.exec('BEGIN');
  try {
    for (const id of ids) {
      if (body.action === 'complete') out.push(complete(user.id, 'tasks', id)); else if (body.action === 'reopen') out.push(reopen(user.id, 'tasks', id)); else if (body.action === 'archive') out.push(archive(user.id, 'tasks', id)); else if (body.action === 'update') out.push(update(user.id, 'tasks', id, body.patch ?? {})); else throw new HttpError(400, 'Unknown bulk action');
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { count: out.length };
});

/* ---------- aggregate / derived ---------- */
route('GET', '/api/bootstrap', ({ user }) => {
  const u = user.id; const since = new Date(Date.now() - 30 * 864e5).toISOString();
  return {
    user: sessionUser(user), progress: computeProgress(u),
    goals: all(u, 'goals'), projects: all(u, 'projects'), milestones: all(u, 'milestones'),
    tasks: rows(u, 'tasks', 'done_at IS NULL OR done_at >= ?', since), deadlines: rows(u, 'deadlines', "status = 'open' OR completed_at >= ?", since),
  };
});
route('GET', '/api/today', ({ user }) => today(user.id));
route('GET', '/api/progress', ({ user }) => {
  const u = user.id; const p = computeProgress(u);
  return { ...p, goalList: all(u, 'goals').map((g) => ({ id: g.id, title: g.title, status: g.status, domain: g.domain, ...p.goals[g.id], health: goalHealth(u, g, p) })), projectList: all(u, 'projects').map((x) => ({ id: x.id, title: x.title, status: x.status, domain: x.domain, goal_id: x.goal_id, ...p.projects[x.id], health: projectHealth(u, x, p) })), planVsActual: planVsActual(u, 14) };
});
route('GET', '/api/projects/:id/health', ({ user, params }) => { const p = get(user.id, 'projects', params.id); return { ...projectHealth(user.id, p), why: whyBehind(user.id, p.id) }; });
route('GET', '/api/milestones-view', ({ user }) => {
  const u = user.id; const p = computeProgress(u); const now = new Date();
  return all(u, 'milestones', { sort: 'due_at:asc' }).map((m) => {
    const pr = p.milestones[m.id]; const overdue = !m.done_at && m.due_at && new Date(m.due_at) < now;
    const soon = !m.done_at && m.due_at && !overdue && (new Date(m.due_at) - now) / 864e5 <= 7 && pr.progress < 0.5;
    return { ...m, ...pr, derived_status: m.done_at ? 'completed' : overdue ? 'overdue' : soon ? 'at_risk' : 'upcoming' };
  });
});
route('GET', '/api/habits-view', ({ user }) => habitsWithStats(user.id));
route('POST', '/api/habits/:id/log', ({ user, params, body }) => {
  get(user.id, 'habits', params.id);
  const day = body?.day ?? dayKey(new Date(), userTz(user.id)); const status = body?.status ?? 'done';
  const ex = db.prepare('SELECT id FROM habit_completions WHERE user_id = ? AND habit_id = ? AND day = ?').get(user.id, params.id, day);
  const rec = ex ? update(user.id, 'habit_completions', ex.id, { status }) : create(user.id, 'habit_completions', { habit_id: params.id, day, status });
  logActivity(user.id, 'habits', params.id, status === 'done' ? 'completed' : 'edited', get(user.id, 'habits', params.id));
  return rec;
});
route('DELETE', '/api/habits/:id/log/:day', ({ user, params }) => { get(user.id, 'habits', params.id); db.prepare('DELETE FROM habit_completions WHERE user_id = ? AND habit_id = ? AND day = ?').run(user.id, params.id, params.day); return { ok: true }; });
route('GET', '/api/calendar', ({ user, query }) => {
  const from = pdate(user, query.from); const to = pdate(user, query.to, true);
  if (!from || !to || to <= from || to - from > 100 * 864e5) throw new HttpError(400, 'Provide from and to (max 100 days)');
  return calendarRange(user.id, from, to);
});
route('GET', '/api/capacity', ({ user, query }) => capacity(user.id, query.from ?? dayKey(new Date(), userTz(user.id)), Math.min(Math.max(Number(query.days) || 7, 1), 31)));
route('GET', '/api/compass', ({ user, query }) => compass(user.id, Math.min(Math.max(Number(query.days) || 14, 1), 90)));
route('GET', '/api/patterns', ({ user }) => patterns(user.id));
route('GET', '/api/achievements', ({ user }) => achievements(user.id));
route('GET', '/api/accomplishments-view', ({ user }) => {
  const u = user.id; const p = computeProgress(u);
  return {
    records: all(u, 'accomplishments', { sort: 'achieved_on:desc' }),
    completedGoals: all(u, 'goals', { filters: { status: 'completed' } }).map((g) => ({ id: g.id, title: g.title, at: g.updated_at, progress: p.goals[g.id]?.progress ?? 0 })),
    completedProjects: all(u, 'projects', { filters: { status: 'completed' } }).map((g) => ({ id: g.id, title: g.title, at: g.updated_at, tasksDone: p.projects[g.id]?.tasksDone ?? 0 })),
    milestones: all(u, 'milestones', { filters: { done_at: '!null' }, sort: 'done_at:desc' }).slice(0, 20).map((m) => ({ id: m.id, title: m.title, at: m.done_at })),
  };
});
route('GET', '/api/alerts', ({ user, query }) => alertList(user.id, { includeDismissed: query.all === '1' }));
route('POST', '/api/alerts/:id/:action', ({ user, params, body }) => {
  const now = new Date().toISOString();
  if (params.action === 'read') return update(user.id, 'alerts', params.id, { read_at: now });
  if (params.action === 'dismiss') return update(user.id, 'alerts', params.id, { dismissed_at: now, read_at: now });
  if (params.action === 'snooze') { const h = Math.min(Math.max(Number(body?.hours) || 24, 1), 24 * 14); return update(user.id, 'alerts', params.id, { snoozed_until: new Date(Date.now() + h * 3600000).toISOString() }); }
  throw new HttpError(400, 'Unknown action');
});
route('POST', '/api/alerts-read-all', ({ user }) => { db.prepare('UPDATE alerts SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(new Date().toISOString(), user.id); return { ok: true }; });
route('GET', '/api/context/:type/:id', ({ user, params }) => contextFor(user.id, entityOf(params.type), params.id) ?? (() => { throw new HttpError(404, 'Not found'); })());
route('GET', '/api/map/:goalId', ({ user, params }) => relationshipMap(user.id, params.goalId) ?? (() => { throw new HttpError(404, 'Goal not found'); })());
route('GET', '/api/search', ({ user, query }) => { const r = searchAll(user.id, query.q, { types: query.types, sort: query.sort }); if (query.remember === '1') rememberSearch(user.id, query.q); return r; });
route('GET', '/api/timeline', ({ user, query }) => timeline(user.id, { from: query.from, to: query.to, domain: query.domain, entity: query.entity, entityId: query.entity_id, limit: query.limit, offset: query.offset }));
route('GET', '/api/review-facts', ({ user, query }) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(query.start ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(query.end ?? '')) throw new HttpError(400, 'start and end required'); return reviewFacts(user.id, query.start, query.end); });
route('POST', '/api/inbox/:id/convert', ({ user, params, body }) => inboxConvert(user.id, params.id, body?.as, body?.fields ?? {}));

/* ---------- focus ---------- */
route('GET', '/api/focus', ({ user, query }) => {
  const u = user.id; const current = rows(u, 'focus_sessions', "status IN ('running','paused')")[0] ?? null;
  const since = new Date(Date.now() - (Number(query.days) || 30) * 864e5).toISOString();
  const history = rows(u, 'focus_sessions', "started_at >= ? AND status IN ('completed','stopped')", since).sort((a, b) => b.started_at.localeCompare(a.started_at));
  const tz = userTz(u); const byDay = {};
  for (const s of history) { const k = dayKey(new Date(s.started_at), tz); byDay[k] = (byDay[k] ?? 0) + s.accumulated_ms / 60000; }
  return { current, serverNow: new Date().toISOString(), history: history.slice(0, 60), byDay: Object.entries(byDay).map(([day, minutes]) => ({ day, minutes: Math.round(minutes) })), totalMinutes: Math.round(history.reduce((s, x) => s + x.accumulated_ms / 60000, 0)), sessions: history.length };
});
route('POST', '/api/focus', ({ user, body }) => focusStart(user.id, body ?? {}));
route('POST', '/api/focus/:id/:action', ({ user, params, body }) => focusAction(user.id, params.id, params.action, body ?? {}));
route('POST', '/api/experiments/:id/:action', ({ user, params, body }) => experimentAction(user.id, params.id, params.action, body ?? {}));
route('GET', '/api/experiments/:id/results', ({ user, params }) => experimentResults(user.id, params.id));

/* ---------- domains ---------- */
const DOMAINS = { study: studyOverview, academic: academicOverview, work: workOverview, fitness: fitnessOverview, finance: financeOverview, personal: personalOverview };
route('GET', '/api/domains/:id/overview', ({ user, params }) => { const f = DOMAINS[params.id]; if (!f) throw new HttpError(404, 'Unknown domain'); const u = user.id; return { ...f(u), core: { tasksOpen: rows(u, 'tasks', 'domain = ? AND done_at IS NULL', params.id).length, goals: rows(u, 'goals', 'domain = ?', params.id).length, projects: rows(u, 'projects', 'domain = ?', params.id).length } }; });
route('GET', '/api/domains-summary', ({ user }) => Object.fromEntries(Object.keys(DOMAINS).map((d) => [d, { tasksOpen: rows(user.id, 'tasks', 'domain = ? AND done_at IS NULL', d).length, goals: rows(user.id, 'goals', 'domain = ?', d).length, projects: rows(user.id, 'projects', 'domain = ?', d).length }])));

/* ---------- data / integrations ---------- */
route('GET', '/api/export', ({ user, res }) => { res.setHeader('Content-Disposition', 'attachment; filename="lifeos-export.json"'); return exportAll(user.id); });
route('POST', '/api/import', ({ user, body }) => importAll(user.id, body), { big: true });
route('GET', '/api/integrations', ({ user }) => integrations(user.id));
route('POST', '/api/integrations/:provider/connect', ({ params }) => integrationConnect(params.provider));
route('POST', '/api/integrations/:provider/disconnect', ({ user, params }) => integrationDisconnect(user.id, params.provider));

/* ---------- agent ---------- */
route('GET', '/api/agent/status', ({ user }) => agentStatus(user.id));
route('GET', '/api/agent/conversations', ({ user }) => listConversations(user.id));
route('GET', '/api/agent/conversations/:id', ({ user, params }) => conversationMessages(user.id, params.id));
route('DELETE', '/api/agent/conversations/:id', ({ user, params }) => archive(user.id, 'conversations', params.id));
route('GET', '/api/agent/actions', ({ user }) => actionHistory(user.id));
route('POST', '/api/agent/actions/:id/apply', ({ user, params, body }) => applyAction(user.id, params.id, { confirm: body?.confirm }));
route('POST', '/api/agent/actions/:id/reject', ({ user, params }) => rejectAction(user.id, params.id));
route('POST', '/api/agent/actions/:id/undo', ({ user, params }) => undoAction(user.id, params.id));
route('GET', '/api/agent/actions/:id', ({ user, params }) => publicAction(user.id, params.id));
/* ---------- BYOK (AI key management) ---------- */
route('GET', '/api/ai/key', ({ user }) => getKeyInfo(user.id));
route('POST', '/api/ai/key', ({ user, body }) => saveKey(user.id, body ?? {}));
route('DELETE', '/api/ai/key', ({ user }) => deleteKey(user.id));
route('POST', '/api/ai/test', async ({ user }) => testKey(user.id));

route('GET', '/api/health', () => ({ ok: true, time: new Date().toISOString() }), { auth: false });

/* ---------- http plumbing ---------- */
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'Request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!chunks.length) return resolve(undefined); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Invalid JSON')); } });
    req.on('error', reject);
  });
}
const send = (res, status, data) => {
  if (res.headersSent) return;
  const body = JSON.stringify(data ?? null);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...Object.fromEntries(Object.entries(res.getHeaders())) });
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const query = Object.fromEntries(url.searchParams);
  try {
    if (!url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    // CSRF defence: custom header can't be set cross-site without CORS (which this server never enables).
    if (mutating && req.headers['x-lifeos'] !== '1') throw new HttpError(403, 'Missing request header');
    // Agent chat (SSE)
    if (req.method === 'POST' && url.pathname === '/api/agent/chat') {
      const user = authenticate(req); if (!user) throw new HttpError(401, 'Please sign in');
      const body = await readBody(req, 64_000);
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      const ctl = new AbortController(); res.on('close', () => ctl.abort());
      const emit = (e) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(e)}\n\n`); };
      try { await runAgent({ user, conversationId: body?.conversationId, message: body?.message, emit, signal: ctl.signal }); }
      catch (e) { emit({ type: 'error', status: e.status ?? 500, error: e.status ? e.message : 'The Agent hit an unexpected error. Nothing was changed.', code: e.status === 503 ? 'not_configured' : undefined }); if (!e.status) console.error(e); }
      return res.end();
    }
    const match = routes.map((r) => ({ r, m: r.method === req.method ? r.re.exec(url.pathname) : null })).find((x) => x.m);
    if (!match) return send(res, 404, { error: 'Not found' });
    const user = match.r.auth ? authenticate(req) : null;
    if (match.r.auth && !user) throw new HttpError(401, 'Please sign in');
    const body = mutating ? await readBody(req, match.r.big ? 8_000_000 : 1_000_000) : undefined;
    const out = await match.r.handler({ req, res, user, body, query, params: match.m.groups ?? {} });
    const created = req.method === 'POST' && (/^\/api\/e\/[^/]+$/.test(url.pathname) || url.pathname === '/api/auth/register' || url.pathname === '/api/focus');
    send(res, created ? 201 : 200, out);
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message, fields: e.fields });
    console.error('[api]', e);
    send(res, 500, { error: 'Something went wrong on our side. Please try again.' });
  }
});
server.listen(PORT, '0.0.0.0', () => console.log(`[lifeos-api] listening on :${PORT}`));
void getRaw;
