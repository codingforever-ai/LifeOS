/**
 * Derived intelligence. NOTHING here is stored as editable state: every number is recomputed from source records
 * (tasks, milestones, completions, focus sessions, events…) so analytics can always be rebuilt.
 */
import { db } from './db.mjs';
import { hydrate, getSettings, userTz } from './crud.mjs';
import { ENTITIES } from './schema.mjs';
import { addDays, dayKey, dowOf, expandRecurrence, parseDay, parts, startOfDay, weekStartKey, zonedToUtc, diffDayKeys } from './tz.mjs';

/** Scoped read of up to 5000 live (non-archived) rows. */
export function rows(userId, name, where = '', ...params) {
  const sql = `SELECT * FROM ${name} WHERE user_id = ? AND archived_at IS NULL ${where ? `AND ${where}` : ''} LIMIT 5000`;
  return db.prepare(sql).all(userId, ...params).map((r) => hydrate(name, r));
}
const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + (f(x) || 0), 0);
const ratio = (a, b) => (b > 0 ? a / b : 0);

/* ======================= PROGRESS ======================= */
export function computeProgress(userId) {
  const goals = rows(userId, 'goals'); const projects = rows(userId, 'projects');
  const milestones = rows(userId, 'milestones'); const tasks = rows(userId, 'tasks');
  const byM = group(tasks, 'milestone_id'); const byP = group(tasks, 'project_id'); const byG = group(tasks, 'goal_id');
  const msByP = group(milestones, 'project_id'); const msByG = group(milestones, 'goal_id');
  const frac = (ts) => (ts.length ? ts.filter((t) => t.done_at).length / ts.length : null);

  const ms = {};
  for (const m of milestones) {
    const ts = byM.get(m.id) ?? [];
    ms[m.id] = { progress: m.done_at ? 1 : (frac(ts) ?? 0), tasksTotal: ts.length, tasksDone: ts.filter((t) => t.done_at).length, done: !!m.done_at };
  }
  const pr = {};
  for (const p of projects) {
    const units = (msByP.get(p.id) ?? []).map((m) => ms[m.id].progress);
    const loose = (byP.get(p.id) ?? []).filter((t) => !t.milestone_id);
    if (loose.length) units.push(frac(loose));
    const all = byP.get(p.id) ?? [];
    pr[p.id] = { progress: units.length ? sum(units) / units.length : 0, milestonesTotal: (msByP.get(p.id) ?? []).length, milestonesDone: (msByP.get(p.id) ?? []).filter((m) => m.done_at).length, tasksTotal: all.length, tasksDone: all.filter((t) => t.done_at).length };
  }
  const gl = {};
  for (const g of goals) {
    const ps = projects.filter((p) => p.goal_id === g.id);
    const units = ps.map((p) => pr[p.id].progress);
    for (const m of (msByG.get(g.id) ?? []).filter((m) => !m.project_id)) units.push(ms[m.id].progress);
    const loose = (byG.get(g.id) ?? []).filter((t) => !t.project_id && !t.milestone_id);
    if (loose.length) units.push(frac(loose));
    gl[g.id] = { progress: units.length ? sum(units) / units.length : 0, projects: ps.length, projectsDone: ps.filter((p) => p.status === 'completed').length, tasksTotal: sum(ps, (p) => pr[p.id].tasksTotal) + loose.length };
  }
  return { goals: gl, projects: pr, milestones: ms };
}
function group(list, key) { const m = new Map(); for (const x of list) if (x[key]) { if (!m.has(x[key])) m.set(x[key], []); m.get(x[key]).push(x); } return m; }

/* ======================= HEALTH ======================= */
function lastActivity(userId, entity, id) {
  return db.prepare('SELECT MAX(at) a FROM activity WHERE user_id = ? AND entity = ? AND entity_id = ?').get(userId, entity, id).a;
}
export function projectHealth(userId, p, prog = computeProgress(userId)) {
  const now = new Date(); const reasons = [];
  const tasks = rows(userId, 'tasks', 'project_id = ?', p.id); const ms = rows(userId, 'milestones', 'project_id = ?', p.id);
  const overdueT = tasks.filter((t) => !t.done_at && t.due_at && new Date(t.due_at) < now);
  const overdueM = ms.filter((m) => !m.done_at && m.due_at && new Date(m.due_at) < now);
  if (p.status === 'blocked') reasons.push(p.blocked_reason ? `Blocked: ${p.blocked_reason}` : 'Marked as blocked');
  if (overdueT.length) reasons.push(`${overdueT.length} overdue task${overdueT.length > 1 ? 's' : ''}`);
  if (overdueM.length) reasons.push(`${overdueM.length} overdue milestone${overdueM.length > 1 ? 's' : ''}`);
  const remainingMin = sum(tasks.filter((t) => !t.done_at), (t) => t.estimate_min);
  if (p.due_at && p.status !== 'completed') {
    const left = (new Date(p.due_at) - now) / 3600000;
    if (left < 0) reasons.push('Project due date has passed');
    else if (left < 72 && (prog.projects[p.id]?.progress ?? 0) < 0.7) reasons.push(`Due in ${Math.ceil(left / 24)} day(s) with ${Math.round((prog.projects[p.id]?.progress ?? 0) * 100)}% complete`);
    if (remainingMin > 0 && left > 0 && remainingMin / 60 > left * 0.5) reasons.push(`${Math.round(remainingMin / 60)}h of estimated work remains`);
  }
  const last = lastActivity(userId, 'projects', p.id) ?? db.prepare('SELECT MAX(at) a FROM activity WHERE user_id = ? AND entity = ? AND entity_id IN (SELECT id FROM tasks WHERE project_id = ?)').get(userId, 'tasks', p.id).a;
  const idleDays = last ? Math.floor((now - new Date(last)) / 864e5) : Math.floor((now - new Date(p.created_at)) / 864e5);
  const stalled = ['active'].includes(p.status) && idleDays >= 14;
  if (stalled) reasons.push(`No activity for ${idleDays} days`);
  const state = p.status === 'completed' ? 'completed' : p.status === 'blocked' ? 'blocked' : reasons.length >= 2 || overdueM.length ? 'at_risk' : stalled ? 'stalled' : reasons.length ? 'watch' : 'healthy';
  return { state, reasons, idleDays, remainingMin, overdueTasks: overdueT.length, overdueMilestones: overdueM.length };
}
export function goalHealth(userId, g, prog = computeProgress(userId)) {
  const now = new Date(); const reasons = [];
  const projects = rows(userId, 'projects', 'goal_id = ?', g.id).filter((p) => p.status !== 'completed' && p.status !== 'archived');
  const hs = projects.map((p) => ({ p, h: projectHealth(userId, p, prog) }));
  for (const { p, h } of hs) if (['at_risk', 'blocked', 'stalled'].includes(h.state)) reasons.push(`${p.title}: ${h.reasons[0] ?? h.state}`);
  const since = new Date(now - 14 * 864e5).toISOString();
  const recent = db.prepare(`SELECT COUNT(*) c FROM activity WHERE user_id = ? AND at >= ? AND (entity_id = ? OR entity_id IN (SELECT id FROM projects WHERE goal_id = ?) OR entity_id IN (SELECT id FROM tasks WHERE goal_id = ?) OR entity_id IN (SELECT id FROM milestones WHERE goal_id = ?))`).get(userId, since, g.id, g.id, g.id, g.id).c;
  const sessions = db.prepare('SELECT COUNT(*) c FROM focus_sessions WHERE user_id = ? AND goal_id = ? AND started_at >= ?').get(userId, g.id, since).c;
  const inactive = g.status === 'active' && recent + sessions === 0 && now - new Date(g.created_at) > 14 * 864e5;
  if (inactive) reasons.push('No progress or activity in 14 days');
  if (g.target_date && g.status === 'active') {
    const left = (new Date(`${g.target_date}T00:00:00Z`) - now) / 864e5;
    if (left < 0) reasons.push('Target date has passed'); else if (left < 14 && (prog.goals[g.id]?.progress ?? 0) < 0.5) reasons.push(`Target in ${Math.ceil(left)} days at ${Math.round((prog.goals[g.id]?.progress ?? 0) * 100)}%`);
  }
  const state = g.status !== 'active' ? g.status : reasons.length >= 2 ? 'at_risk' : inactive ? 'stalled' : reasons.length ? 'watch' : 'healthy';
  return { state, reasons };
}

/* ======================= HABITS ======================= */
export function computeHabit(h, completions, tz, today = dayKey(new Date(), tz)) {
  const done = new Set(completions.filter((c) => c.status === 'done').map((c) => c.day));
  const skipped = new Set(completions.filter((c) => c.status === 'skipped').map((c) => c.day));
  const weekStart = 1;
  const created = dayKey(new Date(h.created_at), tz);
  const scheduled = (d) => h.cadence === 'daily' || (h.cadence === 'custom' && Array.isArray(h.days) && h.days.includes(dowOf(d)));
  let streak = 0; let longest = 0; let consistency = null;
  const result = { doneToday: done.has(today), skippedToday: skipped.has(today), last7: [] };
  for (let i = 6; i >= 0; i--) { const d = addDays(today, -i); result.last7.push({ day: d, status: done.has(d) ? 'done' : skipped.has(d) ? 'skipped' : scheduled(d) || h.cadence === 'weekly' ? 'open' : 'off' }); }

  if (h.cadence === 'weekly') {
    const weekDone = (ws) => { let n = 0; for (let i = 0; i < 7; i++) if (done.has(addDays(ws, i))) n++; return n; };
    const thisWs = weekStartKey(today, weekStart);
    let best = 0; let run = 0;
    for (let i = 103; i >= 0; i--) { const w = addDays(thisWs, -7 * i); if (weekDone(w) >= h.target_per_week) { run++; best = Math.max(best, run); } else if (i !== 0) run = 0; }
    let s = 0; let ws = thisWs;
    if (weekDone(ws) >= h.target_per_week) s++;
    ws = addDays(ws, -7);
    for (let i = 0; i < 104 && weekDone(ws) >= h.target_per_week; i++) { s++; ws = addDays(ws, -7); }
    streak = s; longest = Math.max(best, s);
    let got = 0; let want = 0;
    for (let i = 0; i < 4; i++) { const w = addDays(thisWs, -7 * i); if (addDays(w, 6) < created) continue; got += Math.min(weekDone(w), h.target_per_week); want += h.target_per_week; }
    consistency = want ? got / want : null;
  } else {
    let d = today; if (!done.has(d) && !skipped.has(d)) d = addDays(d, -1);
    for (let i = 0; i < 800; i++, d = addDays(d, -1)) {
      if (!scheduled(d) && !done.has(d)) continue;
      if (done.has(d)) streak++; else if (skipped.has(d)) continue; else break;
    }
    let run = 0; const start = [...done].sort()[0];
    if (start) for (let k = start; k <= today; k = addDays(k, 1)) { if (done.has(k)) { run++; longest = Math.max(longest, run); } else if (scheduled(k) && !skipped.has(k)) run = 0; }
    let sched = 0; let got = 0;
    for (let i = 0; i < 30; i++) { const k = addDays(today, -i); if (k < created) break; if (!scheduled(k) && !done.has(k)) continue; if (skipped.has(k)) continue; sched++; if (done.has(k)) got++; }
    consistency = sched ? got / sched : null;
  }
  return { ...result, streak, longest, consistency, total: done.size };
}
export function habitsWithStats(userId) {
  const tz = userTz(userId);
  const habits = rows(userId, 'habits');
  const since = addDays(dayKey(new Date(), tz), -800);
  const comps = db.prepare('SELECT * FROM habit_completions WHERE user_id = ? AND day >= ?').all(userId, since).map((r) => hydrate('habit_completions', r));
  const by = group(comps, 'habit_id');
  return habits.map((h) => ({ ...h, stats: computeHabit(h, by.get(h.id) ?? [], tz) }));
}

/* ======================= CALENDAR / CAPACITY ======================= */
export function eventOccurrences(userId, from, to) {
  const tz = userTz(userId);
  const evs = rows(userId, 'events');
  const out = [];
  for (const e of evs) {
    const start = new Date(e.start_at); const dur = e.end_at ? new Date(e.end_at) - start : e.all_day ? 86400000 : 3600000;
    if (e.recurrence) {
      for (const occ of expandRecurrence(e.start_at, dur, e.recurrence, from, to, tz)) out.push({ ...e, series_id: e.id, start_at: occ.toISOString(), end_at: new Date(occ.getTime() + dur).toISOString(), recurring: true });
    } else if (start < to && new Date(start.getTime() + dur) > from) out.push({ ...e, end_at: e.end_at ?? new Date(start.getTime() + dur).toISOString() });
  }
  return out.sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export function detectConflicts(events) {
  const timed = events.filter((e) => !e.all_day && e.kind !== 'time_block').sort((a, b) => a.start_at.localeCompare(b.start_at));
  const out = [];
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
    if (timed[j].start_at >= timed[i].end_at) break;
    out.push({ a: { id: timed[i].id, title: timed[i].title, start_at: timed[i].start_at, end_at: timed[i].end_at }, b: { id: timed[j].id, title: timed[j].title, start_at: timed[j].start_at, end_at: timed[j].end_at } });
  }
  return out;
}

export function calendarRange(userId, from, to) {
  const tz = userTz(userId); const items = [];
  const events = eventOccurrences(userId, from, to);
  for (const e of events) items.push({ source: 'event', id: e.id, series_id: e.series_id, title: e.title, kind: e.kind, domain: e.domain, start: e.start_at, end: e.end_at, allDay: e.all_day, goal_id: e.goal_id, project_id: e.project_id, task_id: e.task_id, place: e.place, recurring: !!e.recurring });
  for (const d of rows(userId, 'deadlines', "status = 'open' AND due_at >= ? AND due_at < ?", from.toISOString(), to.toISOString()))
    items.push({ source: 'deadline', id: d.id, title: d.title, kind: 'deadline', domain: d.domain, start: d.due_at, end: null, allDay: !d.has_time, priority: d.priority });
  for (const t of rows(userId, 'tasks', 'done_at IS NULL AND due_at >= ? AND due_at < ?', from.toISOString(), to.toISOString()))
    items.push({ source: 'task', id: t.id, title: t.title, kind: 'task', domain: t.domain, start: t.due_at, end: t.estimate_min && t.due_has_time ? new Date(new Date(t.due_at).getTime() + t.estimate_min * 60000).toISOString() : null, allDay: !t.due_has_time, priority: t.priority });
  for (const s of rows(userId, 'focus_sessions', "started_at >= ? AND started_at < ? AND status IN ('completed','stopped','running','paused')", from.toISOString(), to.toISOString()))
    items.push({ source: 'focus', id: s.id, title: 'Focus session', kind: 'focus', domain: s.domain, start: s.started_at, end: s.ended_at ?? null, allDay: false });
  items.sort((a, b) => a.start.localeCompare(b.start));
  return { items, conflicts: detectConflicts(events), tz };
}

export function capacity(userId, fromDayKey, days = 7) {
  const s = getSettings(userId); const tz = userTz(userId);
  const wStart = hm(s.workStart); const wEnd = hm(s.workEnd);
  const from = startOfDay(fromDayKey, tz); const to = startOfDay(addDays(fromDayKey, days), tz);
  const events = eventOccurrences(userId, from, to);
  const tasks = rows(userId, 'tasks', 'done_at IS NULL');
  const out = []; const domains = {};
  const today = dayKey(new Date(), tz);
  const bump = (dom, k, v) => { domains[dom ?? 'personal'] ??= { committed: 0, planned: 0 }; domains[dom ?? 'personal'][k] += v; };
  for (let i = 0; i < days; i++) {
    const k = addDays(fromDayKey, i); const dow = dowOf(k); const work = s.workDays.includes(dow);
    const ws = zonedToUtc({ ...parseDay(k), h: Math.floor(wStart / 60), mi: wStart % 60 }, tz); const we = zonedToUtc({ ...parseDay(k), h: Math.floor(wEnd / 60), mi: wEnd % 60 }, tz);
    const available = work ? Math.max(0, wEnd - wStart) : 0;
    let committed = 0; let focusBlocks = 0;
    for (const e of events) {
      if (e.all_day) continue; const a = new Date(e.start_at); const b = new Date(e.end_at);
      const min = Math.max(0, (Math.min(b, we) - Math.max(a, ws)) / 60000);
      if (!work || !min) continue;
      if (e.kind === 'focus_block') { if (!e.task_id) focusBlocks += min; } else if (e.kind !== 'time_block') { committed += min; bump(e.domain, 'committed', min); }
    }
    let planned = focusBlocks; if (focusBlocks) bump('focus', 'planned', focusBlocks);
    let taskCount = 0;
    for (const t of tasks) {
      if (!t.due_at) continue; const tk = dayKey(new Date(t.due_at), tz);
      if (tk === k || (i === 0 && tk < today)) { planned += t.estimate_min ?? 0; taskCount++; bump(t.domain, 'planned', t.estimate_min ?? 0); }
    }
    const buffer = work ? s.bufferMin : 0; const remaining = available - committed - buffer - planned;
    out.push({ day: k, workDay: work, available, committed: Math.round(committed), planned: Math.round(planned), buffer, remaining: Math.round(remaining), overload: work && remaining < 0, tasks: taskCount });
  }
  const unscheduled = tasks.filter((t) => !t.due_at);
  const t = {
    available: sum(out, (d) => d.available), committed: sum(out, (d) => d.committed), planned: sum(out, (d) => d.planned), buffer: sum(out, (d) => d.buffer),
  };
  t.remaining = t.available - t.committed - t.buffer - t.planned;
  return { from: fromDayKey, days: out, totals: t, byDomain: domains, unscheduledMin: sum(unscheduled, (x) => x.estimate_min), unscheduledCount: unscheduled.length, overloadedDays: out.filter((d) => d.overload).map((d) => d.day), conflicts: detectConflicts(events), tz, settings: { workStart: s.workStart, workEnd: s.workEnd, bufferMin: s.bufferMin } };
}

export function planVsActual(userId, days = 14) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const tasks = rows(userId, 'tasks', 'done_at >= ? AND estimate_min IS NOT NULL AND actual_min IS NOT NULL', since);
  const sessions = rows(userId, 'focus_sessions', "started_at >= ? AND status IN ('completed','stopped')", since);
  const est = sum(tasks, (t) => t.estimate_min); const act = sum(tasks, (t) => t.actual_min);
  return {
    days, tasks: { n: tasks.length, estimatedMin: est, actualMin: act, accuracy: est ? act / est : null },
    focus: { n: sessions.length, plannedMin: sum(sessions, (s) => s.planned_min), actualMin: Math.round(sum(sessions, (s) => s.accumulated_ms) / 60000) },
  };
}

/* ======================= COMPASS ======================= */
export function sessionMinutes(s) { return (s.accumulated_ms + (s.status === 'running' && s.running_since ? Date.now() - new Date(s.running_since).getTime() : 0)) / 60000; }

export function compass(userId, days = 14) {
  const tz = userTz(userId); const since = new Date(Date.now() - days * 864e5); const nowD = new Date();
  const goals = rows(userId, 'goals'); const projects = rows(userId, 'projects'); const tasks = rows(userId, 'tasks');
  const pById = new Map(projects.map((p) => [p.id, p])); const tById = new Map(tasks.map((t) => [t.id, t]));
  const sessions = rows(userId, 'focus_sessions', 'started_at >= ?', since.toISOString());
  const events = eventOccurrences(userId, since, nowD).filter((e) => !e.all_day && e.kind !== 'focus_block' && e.kind !== 'time_block');
  const domainMin = {}; const goalMin = {}; const goalDone = {};
  const goalOf = (s) => s.goal_id ?? pById.get(s.project_id)?.goal_id ?? (s.task_id ? (tById.get(s.task_id)?.goal_id ?? pById.get(tById.get(s.task_id)?.project_id)?.goal_id) : null);
  const domOf = (s) => s.domain ?? (s.task_id ? tById.get(s.task_id)?.domain : null) ?? (s.project_id ? pById.get(s.project_id)?.domain : null) ?? 'unassigned';
  for (const s of sessions) { const m = sessionMinutes(s); domainMin[domOf(s)] = (domainMin[domOf(s)] ?? 0) + m; const g = goalOf(s); if (g) goalMin[g] = (goalMin[g] ?? 0) + m; }
  const eventMin = {};
  for (const e of events) { const m = (new Date(e.end_at) - new Date(e.start_at)) / 60000; eventMin[e.domain] = (eventMin[e.domain] ?? 0) + m; }
  for (const t of tasks.filter((t) => t.done_at && new Date(t.done_at) >= since)) { const g = t.goal_id ?? pById.get(t.project_id)?.goal_id; if (g) goalDone[g] = (goalDone[g] ?? 0) + 1; }
  const totalFocus = sum(Object.values(domainMin));
  const allocation = Object.entries(domainMin).map(([domain, minutes]) => ({ domain, minutes: Math.round(minutes), share: ratio(minutes, totalFocus), calendarMinutes: Math.round(eventMin[domain] ?? 0) })).sort((a, b) => b.minutes - a.minutes);
  for (const [domain, m] of Object.entries(eventMin)) if (!domainMin[domain]) allocation.push({ domain, minutes: 0, share: 0, calendarMinutes: Math.round(m) });
  const goalRows = goals.filter((g) => ['active', 'at_risk'].includes(g.status)).map((g) => ({ id: g.id, title: g.title, domain: g.domain, priority: g.priority, focusMinutes: Math.round(goalMin[g.id] ?? 0), share: ratio(goalMin[g.id] ?? 0, totalFocus), tasksCompleted: goalDone[g.id] ?? 0 })).sort((a, b) => a.priority - b.priority || b.focusMinutes - a.focusMinutes);
  const plan = capacity(userId, addDays(dayKey(since, tz), 0), days); // planned work in window
  const planned = Object.fromEntries(Object.entries(plan.byDomain).map(([d, v]) => [d, Math.round(v.planned)]));
  return {
    days, totalFocusMinutes: Math.round(totalFocus), allocation, goals: goalRows,
    neglected: goalRows.filter((g) => g.focusMinutes === 0 && g.tasksCompleted === 0).map((g) => g.title),
    plannedVsActual: Object.keys({ ...planned, ...domainMin }).map((d) => ({ domain: d, plannedMin: planned[d] ?? 0, actualMin: Math.round(domainMin[d] ?? 0) })),
    topPriorities: goalRows.filter((g) => g.priority === 1),
  };
}

/* ======================= PATTERNS ======================= */
const conf = (n, lo = 5, hi = 15) => (n >= hi ? 'high' : n >= lo ? 'medium' : 'low');
export function patterns(userId) {
  const tz = userTz(userId); const out = []; const gaps = [];
  const since90 = new Date(Date.now() - 90 * 864e5).toISOString();
  const sessions = rows(userId, 'focus_sessions', "started_at >= ? AND status IN ('completed','stopped')", since90);
  if (sessions.length >= 5) {
    const bucket = { morning: 0, afternoon: 0, evening: 0 }; const cnt = { morning: 0, afternoon: 0, evening: 0 };
    for (const s of sessions) { const h = parts(new Date(s.started_at), tz).h; const b = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; bucket[b] += s.accumulated_ms / 60000; cnt[b]++; }
    const best = Object.entries(bucket).sort((a, b) => b[1] - a[1])[0];
    out.push({ id: 'focus-time', kind: 'focus', title: `Most of your focus time is in the ${best[0]}`, detail: `${Math.round(best[1])} of ${Math.round(sum(Object.values(bucket)))} focused minutes happened in the ${best[0]}.`, evidence: Object.entries(bucket).map(([k, v]) => `${k}: ${Math.round(v)} min across ${cnt[k]} sessions`), n: sessions.length, confidence: conf(sessions.length) });
    const planned = sum(sessions, (s) => s.planned_min); const actual = sum(sessions, (s) => s.accumulated_ms) / 60000;
    const completed = sessions.filter((s) => s.status === 'completed').length;
    out.push({ id: 'focus-duration', kind: 'focus', title: `Sessions run at ${Math.round(ratio(actual, planned) * 100)}% of planned length`, detail: `${completed} of ${sessions.length} sessions were seen through to the end. Average actual length ${Math.round(actual / sessions.length)} min.`, evidence: [`Planned ${planned} min, actual ${Math.round(actual)} min`], n: sessions.length, confidence: conf(sessions.length) });
  } else gaps.push('Focus patterns need at least 5 finished focus sessions.');

  const done = rows(userId, 'tasks', 'done_at >= ?', since90);
  if (done.length >= 8) {
    const wd = [0, 0, 0, 0, 0, 0, 0]; for (const t of done) wd[parts(new Date(t.done_at), tz).dow]++;
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; const top = wd.indexOf(Math.max(...wd));
    out.push({ id: 'completion-day', kind: 'tasks', title: `You finish the most tasks on ${names[top]}s`, detail: `${wd[top]} of ${done.length} completed tasks were finished on a ${names[top]}.`, evidence: names.map((n, i) => `${n}: ${wd[i]}`), n: done.length, confidence: conf(done.length, 8, 25) });
  } else gaps.push('Task completion patterns need at least 8 completed tasks.');

  const lastMinute = done.filter((t) => t.due_at && t.due_has_time);
  const dls = rows(userId, 'deadlines', "status = 'done' AND completed_at IS NOT NULL");
  if (dls.length >= 3) {
    const onTime = dls.filter((d) => d.completed_at <= d.due_at).length;
    const lastDay = dls.filter((d) => d.completed_at <= d.due_at && new Date(d.due_at) - new Date(d.completed_at) < 864e5).length;
    out.push({ id: 'deadline-behavior', kind: 'deadlines', title: `${onTime} of ${dls.length} deadlines were completed on time`, detail: lastDay ? `${lastDay} were finished within the final 24 hours.` : 'None were left to the final day.', evidence: [`On time: ${onTime}`, `Late: ${dls.length - onTime}`, `Final-day finishes: ${lastDay}`], n: dls.length, confidence: conf(dls.length, 3, 10) });
  } else gaps.push('Deadline behaviour needs at least 3 completed deadlines.');
  void lastMinute;

  const resched = db.prepare("SELECT entity_id, title, COUNT(*) c FROM activity WHERE user_id = ? AND action = 'rescheduled' AND entity IN ('tasks','deadlines') GROUP BY entity_id HAVING c >= 2 ORDER BY c DESC LIMIT 5").all(userId);
  if (resched.length) out.push({ id: 'recurring-delays', kind: 'delays', title: `${resched.length} item${resched.length > 1 ? 's keep' : ' keeps'} getting pushed back`, detail: resched.map((r) => `${r.title} (moved ${r.c}×)`).join('; '), evidence: resched.map((r) => `${r.title}: rescheduled ${r.c} times`), n: resched.length, confidence: 'medium' });

  const cap = capacity(userId, dayKey(new Date(), tz), 14);
  if (cap.overloadedDays.length) out.push({ id: 'overload', kind: 'capacity', title: `${cap.overloadedDays.length} of the next 14 days are over capacity`, detail: `Planned work exceeds the time available on ${cap.overloadedDays.join(', ')}.`, evidence: cap.days.filter((d) => d.overload).map((d) => `${d.day}: ${-d.remaining} min over`), n: cap.days.filter((d) => d.workDay).length, confidence: 'high' });

  const c = compass(userId, 14);
  if (c.totalFocusMinutes >= 120 && c.allocation.length >= 2 && c.allocation[0].share > 0.65) out.push({ id: 'domain-imbalance', kind: 'balance', title: `${Math.round(c.allocation[0].share * 100)}% of focus time went to ${c.allocation[0].domain}`, detail: `Over the last 14 days. Other areas received ${100 - Math.round(c.allocation[0].share * 100)}% combined.`, evidence: c.allocation.map((a) => `${a.domain}: ${a.minutes} min`), n: c.totalFocusMinutes, confidence: conf(c.totalFocusMinutes / 30, 4, 10) });

  const pva = planVsActual(userId, 60);
  if (pva.tasks.n >= 3 && pva.tasks.accuracy) out.push({ id: 'planning-accuracy', kind: 'planning', title: pva.tasks.accuracy > 1.15 ? `Tasks take about ${Math.round((pva.tasks.accuracy - 1) * 100)}% longer than estimated` : pva.tasks.accuracy < 0.85 ? `Tasks finish about ${Math.round((1 - pva.tasks.accuracy) * 100)}% faster than estimated` : 'Your estimates are accurate', detail: `Across ${pva.tasks.n} tasks: estimated ${pva.tasks.estimatedMin} min, actual ${pva.tasks.actualMin} min.`, evidence: [`Ratio ${pva.tasks.accuracy.toFixed(2)}`], n: pva.tasks.n, confidence: conf(pva.tasks.n, 3, 12) });
  else gaps.push('Planning accuracy needs 3+ completed tasks with both an estimate and an actual time.');

  const hs = habitsWithStats(userId).filter((h) => h.status === 'active' && h.stats.consistency !== null);
  if (hs.length) { const sorted = [...hs].sort((a, b) => b.stats.consistency - a.stats.consistency); out.push({ id: 'habit-consistency', kind: 'habits', title: `${sorted[0].title} is your most consistent habit`, detail: sorted.map((h) => `${h.title}: ${Math.round(h.stats.consistency * 100)}%`).join(' · '), evidence: sorted.map((h) => `${h.title}: ${h.stats.total} completions, streak ${h.stats.streak}`), n: sum(hs, (h) => h.stats.total), confidence: conf(sum(hs, (h) => h.stats.total), 7, 30) }); }
  return { patterns: out, needsMoreData: gaps, note: 'Patterns are observations from your own records, not conclusions. Confidence reflects sample size.' };
}

/* ======================= ACHIEVEMENTS (derived) ======================= */
export function achievements(userId) {
  const goals = rows(userId, 'goals', "status = 'completed'"); const projects = rows(userId, 'projects', "status = 'completed'");
  const sessions = rows(userId, 'focus_sessions', "status IN ('completed','stopped')");
  const focusH = sum(sessions, (s) => s.accumulated_ms) / 3600000;
  const reviews = rows(userId, 'reviews'); const habits = habitsWithStats(userId);
  const ms = rows(userId, 'milestones', 'done_at IS NOT NULL');
  const bestStreak = Math.max(0, ...habits.map((h) => h.stats.longest));
  const doneTasks = rows(userId, 'tasks', 'done_at IS NOT NULL AND goal_id IS NOT NULL');
  const weeksByGoal = {}; const tz = userTz(userId);
  for (const t of doneTasks) (weeksByGoal[t.goal_id] ??= new Set()).add(weekStartKey(dayKey(new Date(t.done_at), tz)));
  const sustained = Object.entries(weeksByGoal).sort((a, b) => b[1].size - a[1].size)[0];
  const q = reviews.filter((r) => r.kind === 'quarterly');
  const def = (id, title, description, achieved, progress, evidence, at) => ({ id, title, description, achieved, progress: Math.min(1, progress), evidence, at: achieved ? at ?? null : null });
  return [
    def('first-goal', 'First completed goal', 'Complete any goal.', goals.length > 0, goals.length ? 1 : 0, goals[0] ? `Completed “${goals[0].title}”` : 'No completed goals yet', goals[0]?.updated_at),
    def('first-project', 'First completed project', 'Complete any project.', projects.length > 0, projects.length ? 1 : 0, projects[0] ? `Completed “${projects[0].title}”` : 'No completed projects yet', projects[0]?.updated_at),
    def('focus-100', '100 focus hours', 'Log 100 hours of focused work.', focusH >= 100, focusH / 100, `${focusH.toFixed(1)} of 100 hours logged`),
    def('consistency-30', '30-day consistency', 'Keep any habit going for 30 days.', bestStreak >= 30, bestStreak / 30, `Longest streak ${bestStreak} day(s)`),
    def('quarterly-review', 'Completed a quarterly review', 'Finish a quarterly review.', q.length > 0, q.length ? 1 : 0, q.length ? `${q.length} quarterly review(s)` : 'No quarterly review yet', q[0]?.created_at),
    def('major-milestones', 'Major milestones', 'Complete 10 milestones.', ms.length >= 10, ms.length / 10, `${ms.length} of 10 milestones completed`),
    def('sustained-progress', 'Sustained goal progress', 'Complete work toward one goal in 4 different weeks.', (sustained?.[1].size ?? 0) >= 4, (sustained?.[1].size ?? 0) / 4, `${sustained?.[1].size ?? 0} of 4 active weeks on one goal`),
  ];
}

/* ======================= ALERTS ======================= */
export function refreshAlerts(userId) {
  const s = getSettings(userId); const n = s.notifications; const tz = userTz(userId); const now = new Date(); const today = dayKey(now, tz);
  const existing = new Map(db.prepare('SELECT dedupe_key, dismissed_at FROM alerts WHERE user_id = ? AND dedupe_key IS NOT NULL').all(userId).map((r) => [r.dedupe_key, r]));
  const todaysCount = db.prepare("SELECT COUNT(*) c FROM alerts WHERE user_id = ? AND created_at >= ?").get(userId, startOfDay(today, tz).toISOString()).c;
  let budget = Math.max(0, (n.maxPerDay ?? 6) - todaysCount);
  const add = (key, kind, title, body, priority, ref_type, ref_id) => {
    if (!budget || existing.has(key)) return; budget--;
    const t = now.toISOString();
    db.prepare('INSERT INTO alerts (id,user_id,created_at,updated_at,kind,title,body,priority,ref_type,ref_id,dedupe_key) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(), userId, t, t, kind, title, body, priority, ref_type, ref_id, key);
  };
  const soon = new Date(now.getTime() + 48 * 3600000).toISOString();
  if (n.deadlines) for (const d of rows(userId, 'deadlines', "status = 'open' AND due_at >= ? AND due_at < ?", now.toISOString(), soon)) add(`dl-soon:${d.id}:${dayKey(new Date(d.due_at), tz)}`, 'deadline', `“${d.title}” is due soon`, `Due ${new Date(d.due_at).toLocaleString('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' })}.`, d.priority, 'deadlines', d.id);
  if (n.overdue) for (const d of rows(userId, 'deadlines', "status = 'open' AND due_at < ?", now.toISOString()).slice(0, 5)) add(`dl-over:${d.id}`, 'overdue', `“${d.title}” is overdue`, 'You can reschedule it, complete it, or cancel it.', 'high', 'deadlines', d.id);
  if (n.capacity) { const c = capacity(userId, today, 3); for (const d of c.days.filter((x) => x.overload)) add(`cap:${d.day}`, 'capacity', `${d.day} looks over capacity`, `About ${-d.remaining} minutes more is planned than fits. Consider moving something.`, 'medium', 'capacity', d.day); for (const x of c.conflicts.slice(0, 2)) add(`conf:${x.a.id}:${x.b.id}:${x.a.start_at}`, 'conflict', `Schedule conflict: ${x.a.title} / ${x.b.title}`, 'Two events overlap.', 'medium', 'events', x.a.id); }
  if (n.stalled) { const prog = computeProgress(userId); for (const p of rows(userId, 'projects', "status = 'active'")) { const h = projectHealth(userId, p, prog); if (h.state === 'stalled') add(`stalled:${p.id}:${weekStartKey(today)}`, 'stalled', `“${p.title}” has stalled`, h.reasons[0] ?? '', 'low', 'projects', p.id); } for (const g of rows(userId, 'goals', "status = 'active'")) { const h = goalHealth(userId, g, prog); if (h.state === 'stalled') add(`inactive:${g.id}:${weekStartKey(today)}`, 'inactive_goal', `No recent activity on “${g.title}”`, h.reasons[0] ?? '', 'low', 'goals', g.id); } }
  if (n.habits) for (const h of habitsWithStats(userId).filter((x) => x.status === 'active' && x.stats.streak >= 7 && !x.stats.doneToday && x.cadence === 'daily')) add(`habit:${h.id}:${today}`, 'habit', `Keep your ${h.stats.streak}-day “${h.title}” going`, 'Not logged yet today.', 'low', 'habits', h.id);
}
export function alertList(userId, { includeDismissed = false } = {}) {
  refreshAlerts(userId);
  const now = new Date().toISOString();
  const all = rows(userId, 'alerts').filter((a) => includeDismissed || (!a.dismissed_at && !(a.snoozed_until && a.snoozed_until > now)));
  const P = { high: 0, medium: 1, low: 2 };
  return all.sort((a, b) => (a.read_at ? 1 : 0) - (b.read_at ? 1 : 0) || P[a.priority] - P[b.priority] || b.created_at.localeCompare(a.created_at));
}

/* ======================= CONTEXT ENGINE / MAP ======================= */
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined && o[k] !== null).map((k) => [k, o[k]]));
const brief = (type, r) => ({ type, id: r.id, ...pick(r, ['title', 'name', 'status', 'due_at', 'start_at', 'done_at', 'domain', 'priority', 'estimate_min', 'planned_min']) });

/** Everything related to a record, via typed relationships (never arbitrary queries). */
export function contextFor(userId, type, id) {
  const sp = ENTITIES[type]; if (!sp) return null;
  const rec = rows(userId, type, 'id = ?', id)[0]; if (!rec) return null;
  const prog = computeProgress(userId); const ctx = { entity: { type, ...rec }, related: {} };
  const R = ctx.related;
  if (type === 'goal' || type === 'goals') {
    R.projects = rows(userId, 'projects', 'goal_id = ?', id).map((r) => ({ ...brief('projects', r), progress: prog.projects[r.id]?.progress }));
    R.milestones = rows(userId, 'milestones', 'goal_id = ?', id).map((r) => brief('milestones', r));
    R.tasks = rows(userId, 'tasks', 'goal_id = ? OR project_id IN (SELECT id FROM projects WHERE goal_id = ?)', id, id).slice(0, 60).map((r) => brief('tasks', r));
    R.habits = rows(userId, 'habits', 'goal_id = ?', id).map((r) => brief('habits', r));
    R.deadlines = rows(userId, 'deadlines', 'goal_id = ?', id).map((r) => brief('deadlines', r));
    R.focus_sessions = rows(userId, 'focus_sessions', 'goal_id = ?', id).slice(-20).map((r) => ({ ...brief('focus_sessions', r), minutes: Math.round(sessionMinutes(r)) }));
    R.measurements = rows(userId, 'measurements', 'goal_id = ?', id).map((r) => pick(r, ['id', 'name', 'value', 'unit', 'at']));
    ctx.progress = prog.goals[id]; ctx.health = goalHealth(userId, rec, prog);
  } else if (type === 'projects') {
    R.goal = rec.goal_id ? rows(userId, 'goals', 'id = ?', rec.goal_id).map((r) => brief('goals', r)) : [];
    R.milestones = rows(userId, 'milestones', 'project_id = ?', id).map((r) => ({ ...brief('milestones', r), progress: prog.milestones[r.id]?.progress }));
    R.tasks = rows(userId, 'tasks', 'project_id = ?', id).slice(0, 80).map((r) => brief('tasks', r));
    R.deadlines = rows(userId, 'deadlines', 'project_id = ?', id).map((r) => brief('deadlines', r));
    R.events = rows(userId, 'events', 'project_id = ?', id).map((r) => brief('events', r));
    R.notes = rows(userId, 'notes', 'project_id = ?', id).map((r) => brief('notes', r));
    R.focus_sessions = rows(userId, 'focus_sessions', 'project_id = ?', id).slice(-20).map((r) => ({ ...brief('focus_sessions', r), minutes: Math.round(sessionMinutes(r)) }));
    ctx.progress = prog.projects[id]; ctx.health = projectHealth(userId, rec, prog);
  } else if (type === 'milestones') {
    R.project = rec.project_id ? rows(userId, 'projects', 'id = ?', rec.project_id).map((r) => brief('projects', r)) : [];
    R.tasks = rows(userId, 'tasks', 'milestone_id = ?', id).map((r) => brief('tasks', r));
    R.deadline = rec.deadline_id ? rows(userId, 'deadlines', 'id = ?', rec.deadline_id).map((r) => brief('deadlines', r)) : [];
    ctx.progress = prog.milestones[id];
  } else if (type === 'tasks') {
    R.deadline = rec.deadline_id ? rows(userId, 'deadlines', 'id = ?', rec.deadline_id).map((r) => brief('deadlines', r)) : [];
    R.milestone = rec.milestone_id ? rows(userId, 'milestones', 'id = ?', rec.milestone_id).map((r) => brief('milestones', r)) : [];
    R.project = rec.project_id ? rows(userId, 'projects', 'id = ?', rec.project_id).map((r) => brief('projects', r)) : [];
    R.goal = rec.goal_id ? rows(userId, 'goals', 'id = ?', rec.goal_id).map((r) => brief('goals', r)) : [];
    R.subtasks = rows(userId, 'tasks', 'parent_id = ?', id).map((r) => brief('tasks', r));
    R.depends_on = rows(userId, 'task_dependencies', 'task_id = ?', id).map((d) => rows(userId, 'tasks', 'id = ?', d.depends_on_id)[0]).filter(Boolean).map((r) => brief('tasks', r));
    R.blocks = rows(userId, 'task_dependencies', 'depends_on_id = ?', id).map((d) => rows(userId, 'tasks', 'id = ?', d.task_id)[0]).filter(Boolean).map((r) => brief('tasks', r));
    R.events = rows(userId, 'events', 'task_id = ?', id).map((r) => brief('events', r));
    R.focus_sessions = rows(userId, 'focus_sessions', 'task_id = ?', id).map((r) => ({ ...brief('focus_sessions', r), minutes: Math.round(sessionMinutes(r)) }));
  } else if (type === 'deadlines') {
    for (const k of ['goal_id', 'project_id', 'milestone_id']) if (rec[k]) R[k.replace('_id', '')] = rows(userId, k.replace('_id', 's').replace('milestones', 'milestones'), 'id = ?', rec[k]).map((r) => brief(k.replace('_id', 's'), r));
    R.tasks = rows(userId, 'tasks', 'deadline_id = ?', id).map((r) => brief('tasks', r));
    R.milestones = rows(userId, 'milestones', 'deadline_id = ?', id).map((r) => brief('milestones', r));
  }
  ctx.activity = db.prepare('SELECT action, at, actor, title FROM activity WHERE user_id = ? AND entity = ? AND entity_id = ? ORDER BY at DESC LIMIT 15').all(userId, type, id);
  return ctx;
}

/** Focused relationship tree: Goal → Project → Milestone → Task → Focus → Outcome → Review → Learning. */
export function relationshipMap(userId, goalId) {
  const prog = computeProgress(userId);
  const goal = rows(userId, 'goals', 'id = ?', goalId)[0]; if (!goal) return null;
  const node = (type, r, children = [], extra = {}) => ({ type, id: r.id, title: r.title ?? r.name, status: r.status ?? (r.done_at ? 'done' : 'open'), ...extra, children });
  const mins = (kind, id) => Math.round(sum(rows(userId, 'focus_sessions', `${kind} = ?`, id), sessionMinutes));
  const taskNode = (t) => node('tasks', t, [], { status: t.done_at ? 'done' : 'open', focusMinutes: mins('task_id', t.id) });
  const msNode = (m) => node('milestones', m, rows(userId, 'tasks', 'milestone_id = ?', m.id).map(taskNode), { progress: prog.milestones[m.id]?.progress });
  const projects = rows(userId, 'projects', 'goal_id = ?', goalId).map((p) => {
    const kids = rows(userId, 'milestones', 'project_id = ?', p.id).map(msNode);
    const loose = rows(userId, 'tasks', 'project_id = ? AND milestone_id IS NULL', p.id).map(taskNode);
    return node('projects', p, [...kids, ...loose], { progress: prog.projects[p.id]?.progress, focusMinutes: mins('project_id', p.id) });
  });
  const directMs = rows(userId, 'milestones', 'goal_id = ? AND project_id IS NULL', goalId).map(msNode);
  const directTasks = rows(userId, 'tasks', 'goal_id = ? AND project_id IS NULL AND milestone_id IS NULL', goalId).map(taskNode);
  const tz = userTz(userId); const reviewsAll = rows(userId, 'reviews');
  const learning = [
    ...rows(userId, 'decisions', "learned IS NOT NULL AND learned != ''").slice(0, 5).map((d) => ({ type: 'decisions', id: d.id, title: d.learned, status: 'learning', children: [] })),
    ...reviewsAll.slice(-3).map((r) => ({ type: 'reviews', id: r.id, title: `${r.kind} review ${r.period_start}`, status: 'review', children: [] })),
  ];
  void tz;
  return { ...node('goals', goal, [...projects, ...directMs, ...directTasks], { progress: prog.goals[goalId]?.progress, focusMinutes: mins('goal_id', goalId) }), outcome: { completedTasks: sum(projects, (p) => countDone(p)) + directTasks.filter((t) => t.status === 'done').length }, learning };
}
function countDone(n) { return (n.type === 'tasks' && n.status === 'done' ? 1 : 0) + sum(n.children, countDone); }

/** "Why is this project behind?" — facts only. */
export function whyBehind(userId, projectId) {
  const p = rows(userId, 'projects', 'id = ?', projectId)[0]; if (!p) return null;
  const h = projectHealth(userId, p);
  const blockedTasks = rows(userId, 'task_dependencies').map((d) => d).filter((d) => rows(userId, 'tasks', 'id = ? AND project_id = ?', d.task_id, projectId).length && rows(userId, 'tasks', 'id = ? AND done_at IS NULL', d.depends_on_id).length);
  const resched = db.prepare("SELECT COUNT(*) c FROM activity WHERE user_id = ? AND action = 'rescheduled' AND entity_id IN (SELECT id FROM tasks WHERE project_id = ?)").get(userId, projectId).c;
  const estimated = sum(rows(userId, 'tasks', 'project_id = ?', projectId), (t) => t.estimate_min); const focused = Math.round(sum(rows(userId, 'focus_sessions', 'project_id = ?', projectId), sessionMinutes));
  return { project: brief('projects', p), health: h, facts: [...h.reasons, ...(blockedTasks.length ? [`${blockedTasks.length} task(s) wait on unfinished dependencies`] : []), ...(resched ? [`Tasks in this project were rescheduled ${resched} times`] : []), `${focused} min focused vs ${estimated} min estimated across all tasks`] };
}

/* ======================= TODAY ======================= */
export function today(userId) {
  const tz = userTz(userId); const s = getSettings(userId); const nowD = new Date(); const k = dayKey(nowD, tz);
  const from = startOfDay(k, tz); const to = startOfDay(addDays(k, 1), tz);
  const cal = calendarRange(userId, from, to);
  const schedule = cal.items.filter((i) => i.source === 'event' || i.source === 'focus').filter((i) => i.kind !== 'time_block' || true);
  const openTasks = rows(userId, 'tasks', 'done_at IS NULL');
  const overdue = openTasks.filter((t) => t.due_at && dayKey(new Date(t.due_at), tz) < k);
  const dueToday = openTasks.filter((t) => t.due_at && dayKey(new Date(t.due_at), tz) === k);
  const P = { high: 0, medium: 1, low: 2 };
  const important = [...overdue, ...dueToday].sort((a, b) => P[a.priority] - P[b.priority]).slice(0, 5);
  const horizon = new Date(nowD.getTime() + 7 * 864e5).toISOString();
  const deadlines = rows(userId, 'deadlines', "status = 'open' AND due_at < ?", horizon).sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, 5);
  const prog = computeProgress(userId);
  const goals = rows(userId, 'goals', "status IN ('active','at_risk')").sort((a, b) => a.priority - b.priority).slice(0, 3).map((g) => ({ ...g, progress: prog.goals[g.id]?.progress ?? 0, health: goalHealth(userId, g, prog) }));
  const cap = capacity(userId, k, 1).days[0];
  const habits = habitsWithStats(userId).filter((h) => h.status === 'active' && (h.cadence !== 'custom' || (h.days ?? []).includes(dowOf(k))));
  const running = rows(userId, 'focus_sessions', "status IN ('running','paused')")[0] ?? null;
  const upcomingDl = deadlines.filter((d) => new Date(d.due_at) - nowD < 48 * 3600000);
  const commitments = schedule.length + openTasks.filter((t) => t.due_at && dayKey(new Date(t.due_at), tz) <= k).length + deadlines.length;
  let state = 'normal'; const why = [];
  if (!cap.workDay && commitments === 0) { state = 'no_commitments'; }
  else if (commitments === 0) { state = 'no_commitments'; why.push('Nothing is scheduled or due today.'); }
  else if (cap.overload) { state = 'overloaded'; why.push(`Planned work is ${-cap.remaining} min over what fits today.`); }
  else if (overdue.length >= 3) { state = 'behind'; why.push(`${overdue.length} tasks are overdue.`); }
  else if (upcomingDl.length) { state = 'deadline_approaching'; why.push(`“${upcomingDl[0].title}” is due ${new Date(upcomingDl[0].due_at) < nowD ? 'now' : 'within 48 hours'}.`); }
  else if (cap.workDay && cap.remaining > 180 && cap.available > 0) { state = 'focus_opportunity'; why.push(`About ${Math.round(cap.remaining / 60)}h of open time today.`); }
  else if (cap.workDay && cap.planned + cap.committed < cap.available * 0.3) { state = 'underplanned'; why.push('Plenty of room — little is planned.'); }
  const inbox = db.prepare("SELECT COUNT(*) c FROM inbox WHERE user_id = ? AND status = 'new' AND archived_at IS NULL").get(userId).c;
  const alerts = alertList(userId).filter((a) => !a.read_at).slice(0, 3);
  void s;
  return { day: k, tz, state, why, schedule, important, overdueCount: overdue.length, deadlines, goals, capacity: cap, habits, running, inbox, alerts };
}

export function overview(userId) {
  const prog = computeProgress(userId);
  return { progress: prog };
}
void diffDayKeys;
