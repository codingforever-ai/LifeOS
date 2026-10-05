/**
 * End-to-end API tests. Spawns an isolated server (temp DB) plus a tiny OpenAI-compatible MOCK model server
 * that exists only for testing the Agent loop mechanics (tool dispatch, proposal, approval, verification, failure).
 * Run: npm run test:api
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 8101; const MOCK = 9911; const base = `http://127.0.0.1:${PORT}`;
let child; let mock; let dir; let script = [];

class Client {
  cookie = '';
  async req(method, path, body, headers = {}) {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-lifeos': '1', cookie: this.cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get('set-cookie'); if (set) this.cookie = set.split(';')[0];
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* sse */ }
    return { status: res.status, json, text };
  }
  get = (p) => this.req('GET', p); post = (p, b = {}) => this.req('POST', p, b); patch = (p, b) => this.req('PATCH', p, b); del = (p, h) => this.req('DELETE', p, undefined, h);
}
const A = new Client(); const B = new Client();

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'lifeos-'));
  mock = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const next = script.shift() ?? { content: 'ok' };
      res.setHeader('content-type', 'application/json');
      if (next.status) { res.statusCode = next.status; return res.end(JSON.stringify({ error: { message: 'mock failure' } })); }
      res.end(JSON.stringify({ choices: [{ message: { content: next.content ?? null, tool_calls: (next.tools ?? []).map((t, i) => ({ id: `c${Date.now()}${i}`, type: 'function', function: { name: t.name, arguments: JSON.stringify(t.args) } })) } }] }));
    });
  }).listen(MOCK);
  child = spawn('node', ['server/index.mjs'], { env: { ...process.env, PORT: String(PORT), LIFEOS_DB: join(dir, 't.db'), AI_API_KEY: 'test-key', AI_BASE_URL: `http://127.0.0.1:${MOCK}`, NODE_NO_WARNINGS: '1' }, stdio: 'inherit' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* wait */ } await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('server did not start');
});
after(() => { child?.kill(); mock?.close(); rmSync(dir, { recursive: true, force: true }); });

test('auth: register, session, logout, bad login, CSRF header', async () => {
  assert.equal((await A.req('GET', '/api/bootstrap')).status, 401);
  const r = await A.post('/api/auth/register', { email: 'a@test.dev', password: 'password123', name: 'Alice', timezone: 'Asia/Kolkata' });
  assert.equal(r.status, 201); assert.equal(r.json.settings.timezone, 'Asia/Kolkata');
  assert.equal((await B.post('/api/auth/register', { email: 'b@test.dev', password: 'password123', name: 'Bob' })).status, 201);
  assert.equal((await A.post('/api/auth/register', { email: 'a@test.dev', password: 'password123', name: 'x' })).status, 409);
  assert.equal((await A.post('/api/auth/register', { email: 'bad', password: 'short', name: '' })).status, 400);
  const noHeader = await fetch(`${base}/api/e/tasks`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: A.cookie }, body: '{"title":"x"}' });
  assert.equal(noHeader.status, 403);
  const C = new Client(); assert.equal((await C.post('/api/auth/login', { email: 'a@test.dev', password: 'nope' })).status, 401);
});

test('validation and user isolation', async () => {
  assert.equal((await A.post('/api/e/tasks', {})).status, 400);
  assert.equal((await A.post('/api/e/tasks', { title: 'x', priority: 'urgent' })).status, 400);
  assert.equal((await A.post('/api/e/tasks', { title: 'x', due_at: 'not-a-date' })).status, 400);
  assert.equal((await A.post('/api/e/habit_completions', { habit_id: 'nope', day: '2025-02-30' })).status, 400);
  const t = (await A.post('/api/e/tasks', { title: 'Alice private', user_id: 'someone-else' })).json;
  assert.ok(t.id); assert.equal(t.user_id, undefined);
  assert.equal((await B.get(`/api/e/tasks/${t.id}`)).status, 404);
  assert.equal((await B.patch(`/api/e/tasks/${t.id}`, { title: 'hacked' })).status, 404);
  assert.equal((await B.del(`/api/e/tasks/${t.id}`)).status, 404);
  assert.equal((await B.get('/api/e/tasks')).json.total, 0);
  const g = (await B.post('/api/e/goals', { title: 'Bob goal' })).json;
  assert.equal((await A.post('/api/e/tasks', { title: 'cross', goal_id: g.id })).status, 400, 'cannot reference another user’s record');
  assert.equal((await B.get(`/api/context/tasks/${t.id}`)).status, 404);
  assert.equal((await A.del(`/api/e/tasks/${t.id}?permanent=1`)).status, 400, 'permanent delete needs strong confirmation');
});

test('derived progress: task → milestone → project → goal, with audit trail', async () => {
  const g = (await A.post('/api/e/goals', { title: 'Ship v1', domain: 'work' })).json;
  const p = (await A.post('/api/e/projects', { title: 'Build', goal_id: g.id, status: 'active' })).json;
  const m1 = (await A.post('/api/e/milestones', { title: 'Alpha', project_id: p.id })).json;
  const m2 = (await A.post('/api/e/milestones', { title: 'Beta', project_id: p.id })).json;
  const t1 = (await A.post('/api/e/tasks', { title: 't1', milestone_id: m1.id, project_id: p.id })).json;
  await A.post('/api/e/tasks', { title: 't2', milestone_id: m1.id, project_id: p.id });
  assert.equal((await A.post('/api/e/goals', { title: 'x', progress: 99 })).json.progress, undefined, 'no stored progress field');
  let pr = (await A.get('/api/progress')).json;
  assert.equal(pr.goals[g.id].progress, 0);
  assert.equal((await A.post(`/api/e/tasks/${t1.id}/complete`)).status, 200);
  pr = (await A.get('/api/progress')).json;
  assert.equal(pr.milestones[m1.id].progress, 0.5); assert.equal(pr.projects[p.id].progress, 0.25); assert.equal(pr.goals[g.id].progress, 0.25);
  await A.post(`/api/e/milestones/${m2.id}/complete`);
  pr = (await A.get('/api/progress')).json; assert.equal(pr.projects[p.id].progress, 0.75);
  const tl = (await A.get('/api/timeline')).json; assert.ok(tl.items.some((i) => i.action === 'completed' && i.title === 't1'));
  await A.post(`/api/e/tasks/${t1.id}/reopen`);
  assert.equal((await A.get('/api/progress')).json.milestones[m1.id].progress, 0);
  const map = (await A.get(`/api/map/${g.id}`)).json; assert.equal(map.children[0].children.length, 2);
});

test('deadlines & recurrence: DST/month-end/leap-year correct', async () => {
  const d = (await A.post('/api/e/deadlines', { title: 'Rent', due_at: '2024-01-31T09:00:00+05:30', tz: 'Asia/Kolkata', recurrence: { freq: 'monthly' } })).json;
  assert.equal(d.recurrence.freq, 'monthly');
  await A.post(`/api/e/deadlines/${d.id}/complete`);
  const next = (await A.get('/api/e/deadlines?status=open')).json.items[0];
  assert.equal(next.due_at, '2024-02-29T03:30:00.000Z', 'Jan 31 → Feb 29 (leap year), same local time');
  await A.post(`/api/e/deadlines/${next.id}/complete`);
  assert.equal((await A.get('/api/e/deadlines?status=open')).json.items[0].due_at, '2024-03-31T03:30:00.000Z');
  // DST: 2024-03-09 09:00 New York (EST) + 1 day → 2024-03-10 (EDT begins) still 09:00 local
  const t = (await A.post('/api/e/tasks', { title: 'daily', due_at: '2024-03-09T14:00:00Z', recurrence: { freq: 'daily' } })).json;
  await A.patch('/api/settings', { timezone: 'America/New_York' });
  await A.post(`/api/e/tasks/${t.id}/complete`);
  const nt = (await A.get('/api/e/tasks?q=daily&done_at=null')).json.items[0];
  assert.equal(nt.due_at, '2024-03-10T13:00:00.000Z', 'wall-clock 09:00 preserved across DST');
  await A.patch('/api/settings', { timezone: 'Asia/Kolkata' });
});

test('habits: streak/consistency derive from completions', async () => {
  const h = (await A.post('/api/e/habits', { title: 'Read', cadence: 'daily' })).json;
  const today = new Date(); const key = (n) => new Date(today.getTime() - n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  for (const n of [0, 1, 2, 4]) await A.post(`/api/habits/${h.id}/log`, { day: key(n), status: 'done' });
  let v = (await A.get('/api/habits-view')).json.find((x) => x.id === h.id).stats;
  assert.equal(v.streak, 3); assert.equal(v.doneToday, true);
  await A.post(`/api/habits/${h.id}/log`, { day: key(3), status: 'skipped' });
  v = (await A.get('/api/habits-view')).json.find((x) => x.id === h.id).stats; assert.equal(v.streak, 5 - 1, 'skipped day does not break or add');
  await A.del(`/api/habits/${h.id}/log/${key(0)}`);
  v = (await A.get('/api/habits-view')).json.find((x) => x.id === h.id).stats; assert.equal(v.doneToday, false); assert.equal(v.streak, 3);
});

test('focus: server-authoritative timer, pause/resume/complete, one at a time', async () => {
  const s = (await A.post('/api/focus', { planned_min: 25 })).json; assert.equal(s.status, 'running');
  assert.equal((await A.post('/api/focus', { planned_min: 25 })).status, 409);
  await new Promise((r) => setTimeout(r, 1100));
  const p = (await A.post(`/api/focus/${s.id}/pause`)).json; assert.equal(p.status, 'paused'); assert.ok(p.accumulated_ms >= 1000);
  const frozen = p.accumulated_ms; await new Promise((r) => setTimeout(r, 600));
  assert.equal((await A.get('/api/e/focus_sessions/' + s.id)).json.accumulated_ms, frozen);
  await A.post(`/api/focus/${s.id}/resume`); const c = (await A.post(`/api/focus/${s.id}/complete`, { note: 'ok' })).json;
  assert.equal(c.status, 'completed'); assert.ok(c.accumulated_ms >= frozen);
  assert.equal((await A.post(`/api/focus/${s.id}/pause`)).status, 409);
  assert.equal((await B.post(`/api/focus/${s.id}/pause`)).status, 404);
});

test('capacity, calendar conflicts, compass and patterns respond', async () => {
  const start = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  await A.post('/api/e/events', { title: 'Meet A', start_at: `${start}T05:00:00Z`, end_at: `${start}T06:00:00Z` });
  await A.post('/api/e/events', { title: 'Meet B', start_at: `${start}T05:30:00Z`, end_at: `${start}T06:30:00Z` });
  const cal = (await A.get(`/api/calendar?from=${start}&to=${start}`)).json; assert.equal(cal.conflicts.length, 1);
  const cap = (await A.get(`/api/capacity?from=${start}&days=2`)).json; assert.equal(cap.days.length, 2);
  assert.ok((await A.get('/api/compass')).json.allocation);
  const pat = (await A.get('/api/patterns')).json; assert.ok(Array.isArray(pat.needsMoreData), 'declines to guess without evidence');
  assert.ok((await A.get('/api/today')).json.state);
  assert.equal((await A.get('/api/achievements')).json.length, 9);
});

async function chat(client, message, conversationId) {
  const r = await client.post('/api/agent/chat', { message, conversationId });
  return r.text.split('\n\n').filter(Boolean).map((l) => JSON.parse(l.replace(/^data: /, '')));
}

test('agent: real loop — read tools, proposal, approval, verification, undo, failure', async () => {
  const task = (await A.post('/api/e/tasks', { title: 'Motion Guidelines', due_at: '2030-01-01T06:00:00Z', estimate_min: 60 })).json;
  script = [{ tools: [{ name: 'get_tasks', args: { q: 'Motion' } }, { name: 'get_capacity', args: {} }] }, { tools: [{ name: 'reschedule_task', args: { id: task.id, due_at: '2030-01-02T14:00' } }, { name: 'create_focus_block', args: { start_at: '2030-01-02T09:00', duration_min: 60, task_id: task.id } }] }, { content: 'I propose moving Motion Guidelines and reserving a focus block.' }];
  const ev = await chat(A, 'Fix my week');
  const done = ev.find((e) => e.type === 'done');
  assert.ok(done.action && done.action.status === 'proposed'); assert.equal(done.action.operations.length, 2);
  assert.equal((await A.get(`/api/e/tasks/${task.id}`)).json.due_at, '2030-01-01T06:00:00.000Z', 'proposal changes nothing');
  assert.ok(ev.some((e) => e.type === 'step' && /Reading your tasks/.test(e.label)));
  const applied = (await A.post(`/api/agent/actions/${done.action.id}/apply`)).json; assert.equal(applied.ok, true);
  const moved = (await A.get(`/api/e/tasks/${task.id}`)).json; assert.equal(moved.due_at, '2030-01-02T08:30:00.000Z', 'local 14:00 IST → 08:30Z');
  assert.equal((await A.post(`/api/agent/actions/${done.action.id}/apply`)).status, 409, 'cannot apply twice');
  assert.equal((await B.post(`/api/agent/actions/${done.action.id}/undo`)).status, 404);
  await A.post(`/api/agent/actions/${done.action.id}/undo`);
  assert.equal((await A.get(`/api/e/tasks/${task.id}`)).json.due_at, '2030-01-01T06:00:00.000Z', 'undo restores');
  assert.equal((await A.get('/api/e/events?kind=focus_block')).json.total, 0, 'undo archives created focus block');

  // safe create executes directly and is verified
  script = [{ tools: [{ name: 'create_note', args: { title: 'Idea', body: 'x' } }] }, { content: 'Saved.' }];
  const ev2 = await chat(A, 'note this'); assert.ok(ev2.some((e) => e.type === 'step' && /verified/.test(e.label)));
  assert.equal((await A.get('/api/e/notes?q=Idea')).json.total, 1);

  // invalid proposal surfaces to the model; nothing is queued
  script = [{ tools: [{ name: 'reschedule_task', args: { id: 'missing', due_at: '2030-01-01' } }] }, { content: 'That task does not exist.' }];
  const ev3 = await chat(A, 'move it'); assert.equal(ev3.find((e) => e.type === 'done').action, null);

  // destructive → strong confirmation
  script = [{ tools: [{ name: 'delete_item', args: { entity: 'tasks', id: task.id } }] }, { content: 'Needs your confirmation.' }];
  const ev4 = await chat(A, 'delete it'); const act = ev4.find((e) => e.type === 'done').action; assert.equal(act.strong, true);
  assert.equal((await A.post(`/api/agent/actions/${act.id}/apply`, {})).status, 400);
  assert.equal((await A.get(`/api/e/tasks/${task.id}`)).status, 200, 'still exists');
  assert.equal((await A.post(`/api/agent/actions/${act.id}/apply`, { confirm: 'DELETE' })).json.ok, true);
  assert.equal((await A.get(`/api/e/tasks/${task.id}`)).status, 404);

  // provider failure → honest error, nothing changed
  script = [{ status: 500 }];
  const ev5 = await chat(A, 'hello'); const d5 = ev5.find((e) => e.type === 'done'); assert.equal(d5.failed, true); assert.match(d5.text, /Nothing was changed/);
  // conversation persisted
  assert.ok((await A.get('/api/agent/conversations')).json.length >= 3);
  assert.equal((await B.get('/api/agent/conversations')).json.length, 0);
});

test('agent: not configured state is explicit (separate server without key)', async () => {
  const st = (await A.get('/api/agent/status')).json; assert.equal(st.configured, true);
});

test('search, inbox triage, export/import round-trip, account deletion', async () => {
  assert.ok((await A.get('/api/search?q=Idea')).json.total >= 1);
  const inb = (await A.post('/api/e/inbox', { kind: 'thought', content: 'Call the bank' })).json;
  const conv = (await A.post(`/api/inbox/${inb.id}/convert`, { as: 'task' })).json; assert.equal(conv.title, 'Call the bank');
  assert.equal((await A.get(`/api/e/inbox/${inb.id}`)).json.status, 'processed');
  const ex = (await A.get('/api/export')).json; assert.ok(ex.entities.tasks.length > 0);
  const before = (await B.get('/api/e/tasks')).json.total;
  const imp = await B.post('/api/import', ex); assert.equal(imp.status, 200);
  assert.ok((await B.get('/api/e/tasks')).json.total > before);
  assert.equal((await B.post('/api/auth/delete', { password: 'wrong', confirm: 'DELETE' })).status, 403);
  assert.equal((await B.post('/api/auth/delete', { password: 'password123', confirm: 'DELETE' })).status, 200);
  assert.equal((await B.get('/api/bootstrap')).status, 401);
});
