/** Domain-specific derived views. Each domain has its own vocabulary and metrics but reads the shared core. */
import { db } from './db.mjs';
import { rows, sessionMinutes, capacity, compass, habitsWithStats } from './derive.mjs';
import { userTz } from './crud.mjs';
import { addDays, dayKey } from './tz.mjs';

const sum = (a, f = (x) => x) => a.reduce((s, x) => s + (f(x) || 0), 0);
const daysTo = (iso, now = new Date()) => Math.ceil((new Date(iso) - now) / 864e5);
const domainMinutes = (u, domain, days = 14) => Math.round(sum(rows(u, 'focus_sessions', 'started_at >= ? AND domain = ?', new Date(Date.now() - days * 864e5).toISOString(), domain), sessionMinutes));

export function studyOverview(u) {
  const subjects = rows(u, 'subjects', "area = 'study'"); const chapters = rows(u, 'chapters'); const topics = rows(u, 'topics');
  const results = rows(u, 'practice_results'); const exams = rows(u, 'exams').filter((e) => new Date(e.exam_at) > new Date()).sort((a, b) => a.exam_at.localeCompare(b.exam_at));
  const today = dayKey(new Date(), userTz(u));
  const per = subjects.map((s) => {
    const ts = topics.filter((t) => t.subject_id === s.id || chapters.some((c) => c.id === t.chapter_id && c.subject_id === s.id));
    const covered = ts.filter((t) => ['practiced', 'revised'].includes(t.status)).length;
    const rs = results.filter((r) => r.subject_id === s.id);
    return { id: s.id, name: s.name, topics: ts.length, covered, weak: ts.filter((t) => t.status === 'weak').length, mastery: ts.length ? covered / ts.length : null, accuracy: rs.length ? sum(rs, (r) => r.score) / Math.max(1, sum(rs, (r) => r.total)) : null, tests: rs.length };
  });
  return {
    subjects: per, topicsByStatus: Object.fromEntries(['new', 'studying', 'practiced', 'weak', 'revised'].map((s) => [s, topics.filter((t) => t.status === s).length])),
    weakTopics: topics.filter((t) => t.status === 'weak').slice(0, 20).map((t) => ({ id: t.id, title: t.title, subject_id: t.subject_id, chapter_id: t.chapter_id })),
    revisionDue: topics.filter((t) => t.next_revision && t.next_revision <= today).slice(0, 20).map((t) => ({ id: t.id, title: t.title, next_revision: t.next_revision })),
    exams: exams.slice(0, 5).map((e) => ({ ...e, daysLeft: daysTo(e.exam_at) })),
    recentResults: results.sort((a, b) => b.taken_at.localeCompare(a.taken_at)).slice(0, 8), focusMinutes14d: domainMinutes(u, 'study'),
    bookmarks: rows(u, 'study_resources', 'bookmarked = 1').length + topics.filter((t) => t.bookmarked).length,
    workflow: ['Exam', 'Subject', 'Chapter', 'Topic', 'Study', 'Practice', 'Test', 'Performance', 'Weak topic', 'Revision', 'Retest'],
  };
}
export function academicOverview(u) {
  const subjects = rows(u, 'subjects', "area = 'academic'"); const exams = rows(u, 'exams'); const assignments = rows(u, 'assignments');
  const now = new Date();
  return {
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, exams: exams.filter((e) => e.subject_id === s.id).length, assignmentsOpen: assignments.filter((a) => a.subject_id === s.id && ['todo', 'in_progress'].includes(a.status)).length })),
    exams: exams.filter((e) => new Date(e.exam_at) >= now).sort((a, b) => a.exam_at.localeCompare(b.exam_at)).map((e) => ({ ...e, daysLeft: daysTo(e.exam_at) })),
    assignmentsOpen: assignments.filter((a) => ['todo', 'in_progress'].includes(a.status)).sort((a, b) => a.due_at.localeCompare(b.due_at)).map((a) => ({ ...a, daysLeft: daysTo(a.due_at), overdue: new Date(a.due_at) < now })),
    submitted: assignments.filter((a) => ['submitted', 'graded'].includes(a.status)).length, focusMinutes14d: domainMinutes(u, 'academic'),
    projects: rows(u, 'projects', "domain = 'academic'").map((p) => ({ id: p.id, title: p.title, status: p.status })),
    gamification: academicGame(u, assignments),
  };
}
export function workOverview(u) {
  const clients = rows(u, 'clients'); const del = rows(u, 'deliverables'); const now = new Date();
  const weekEvents = rows(u, 'events', "domain = 'work' AND start_at >= ? AND start_at < ?", now.toISOString(), new Date(now.getTime() + 7 * 864e5).toISOString());
  return {
    clients: clients.map((c) => ({ id: c.id, name: c.name, status: c.status, deliverables: del.filter((d) => d.client_id === c.id).length, open: del.filter((d) => d.client_id === c.id && d.status !== 'delivered').length })),
    byStatus: Object.fromEntries(['todo', 'in_progress', 'review', 'delivered'].map((s) => [s, del.filter((d) => d.status === s).length])),
    dueSoon: del.filter((d) => d.status !== 'delivered' && d.due_at).sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, 8).map((d) => ({ ...d, overdue: new Date(d.due_at) < now })),
    meetings7d: { count: weekEvents.length, minutes: Math.round(sum(weekEvents, (e) => (e.end_at ? (new Date(e.end_at) - new Date(e.start_at)) / 60000 : 60))) },
    deepWorkMinutes14d: domainMinutes(u, 'work'), outcomes: del.filter((d) => d.outcome).slice(-5).map((d) => ({ id: d.id, title: d.title, outcome: d.outcome })),
    flow: ['Client', 'Project', 'Deliverable', 'Deadline', 'Tasks', 'Meeting', 'Outcome'],
  };
}
export function fitnessOverview(u) {
  const workouts = rows(u, 'workouts').sort((a, b) => b.performed_at.localeCompare(a.performed_at)); const sets = rows(u, 'exercise_sets'); const now = Date.now();
  const inDays = (w, d) => now - new Date(w.performed_at) < d * 864e5;
  const vol = (w) => sum(sets.filter((s) => s.workout_id === w.id), (s) => (s.weight ?? 0) * (s.reps ?? 0));
  const best = {}; for (const s of sets) if (s.weight) best[s.exercise] = Math.max(best[s.exercise] ?? 0, s.weight);
  const recov = workouts.filter((w) => w.recovery && inDays(w, 14));
  return {
    programs: rows(u, 'programs').map((p) => ({ id: p.id, title: p.title, status: p.status, workouts: workouts.filter((w) => w.program_id === p.id).length })),
    thisWeek: workouts.filter((w) => inDays(w, 7)).length, last30: workouts.filter((w) => inDays(w, 30)).length,
    volume7d: Math.round(sum(workouts.filter((w) => inDays(w, 7)), vol)), minutes7d: sum(workouts.filter((w) => inDays(w, 7)), (w) => w.duration_min),
    recoveryAvg: recov.length ? sum(recov, (w) => w.recovery) / recov.length : null, personalBests: Object.entries(best).map(([exercise, weight]) => ({ exercise, weight })).sort((a, b) => b.weight - a.weight).slice(0, 8),
    recent: workouts.slice(0, 8).map((w) => ({ ...w, volume: Math.round(vol(w)), sets: sets.filter((s) => s.workout_id === w.id).length })),
    measurements: rows(u, 'measurements', "domain = 'fitness'").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10),
    habits: habitsWithStats(u).filter((h) => h.domain === 'fitness').map((h) => ({ id: h.id, title: h.title, streak: h.stats.streak, consistency: h.stats.consistency })),
    flow: ['Goal', 'Program', 'Workout', 'Exercise', 'Set', 'Performance', 'Recovery', 'Measurement'],
  };
}
export function financeOverview(u) {
  const items = rows(u, 'finance_items'); const now = new Date(); const in14 = new Date(now.getTime() + 14 * 864e5).toISOString();
  const open = items.filter((i) => i.status === 'open');
  const monthlyFactor = { daily: 30, weekly: 4.345, monthly: 1, yearly: 1 / 12 };
  const byCurrency = {};
  for (const i of open.filter((x) => x.recurrence && ['commitment', 'recurring', 'spending'].includes(x.kind))) { const f = monthlyFactor[i.recurrence.freq] / (i.recurrence.interval ?? 1); byCurrency[i.currency] = (byCurrency[i.currency] ?? 0) + (i.amount_minor ?? 0) * f; }
  return {
    kinds: Object.fromEntries(['goal', 'saving', 'spending', 'commitment', 'recurring', 'plan'].map((k) => [k, items.filter((i) => i.kind === k).length])),
    dueSoon: open.filter((i) => i.due_at && i.due_at <= in14).sort((a, b) => a.due_at.localeCompare(b.due_at)).map((i) => ({ ...i, overdue: new Date(i.due_at) < now })),
    monthlyRecurring: Object.entries(byCurrency).map(([currency, minor]) => ({ currency, amount_minor: Math.round(minor) })),
    savings: Object.entries(items.filter((i) => i.kind === 'saving').reduce((m, i) => ({ ...m, [i.currency]: (m[i.currency] ?? 0) + (i.amount_minor ?? 0) }), {})).map(([currency, amount_minor]) => ({ currency, amount_minor })),
    note: 'Amounts are entered by you. LifeOS does not connect to banks or store account numbers.',
  };
}
export function personalOverview(u) {
  const items = rows(u, 'personal_items'); const now = new Date();
  return { byKind: Object.fromEntries(['errand', 'appointment', 'household', 'relationship', 'travel', 'admin'].map((k) => [k, items.filter((i) => i.kind === k && i.status === 'open').length])), dueSoon: items.filter((i) => i.status === 'open' && i.due_at).sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, 10).map((i) => ({ ...i, overdue: new Date(i.due_at) < now })), openTotal: items.filter((i) => i.status === 'open').length };
}

/** Facts to pre-fill a review from real records (user still writes the reflections). */
export function reviewFacts(u, start, end) {
  const tz = userTz(u);
  const s = new Date(`${start}T00:00:00Z`); const e = new Date(`${addDays(end, 1)}T00:00:00Z`);
  const { startOfDay } = { startOfDay: (k) => new Date(`${k}T00:00:00Z`) };
  void startOfDay;
  const from = s.toISOString(); const to = e.toISOString();
  const done = rows(u, 'tasks', 'done_at >= ? AND done_at < ?', from, to);
  const missed = rows(u, 'tasks', 'done_at IS NULL AND due_at >= ? AND due_at < ?', from, to);
  const sessions = rows(u, 'focus_sessions', "started_at >= ? AND started_at < ? AND status IN ('completed','stopped')", from, to);
  const ms = rows(u, 'milestones', 'done_at >= ? AND done_at < ?', from, to);
  const dl = rows(u, 'deadlines', "completed_at >= ? AND completed_at < ?", from, to);
  const habits = db.prepare("SELECT COUNT(*) c FROM habit_completions WHERE user_id = ? AND status = 'done' AND day >= ? AND day <= ?").get(u, start, end).c;
  const cap = capacity(u, start, Math.min(14, Math.max(1, Math.round((e - s) / 864e5))));
  return {
    period: { start, end, tz }, completed: done.map((t) => ({ id: t.id, title: t.title, domain: t.domain })), missed: missed.map((t) => ({ id: t.id, title: t.title, due_at: t.due_at })),
    milestones: ms.map((m) => ({ id: m.id, title: m.title })), deadlinesMet: dl.map((d) => ({ id: d.id, title: d.title })),
    focus: { sessions: sessions.length, minutes: Math.round(sum(sessions, sessionMinutes)) }, habitCompletions: habits,
    capacity: { available: cap.totals.available, planned: cap.totals.planned, committed: cap.totals.committed },
    compass: compass(u, 7).allocation.slice(0, 4),
  };
}

/** Generic overview for a user-defined domain: the same shared core, filtered by the domain id. */
export function customOverview(u, slug) {
  const now = new Date(); const goals = rows(u, 'goals', 'domain = ?', slug); const tasks = rows(u, 'tasks', 'domain = ?', slug);
  const done = tasks.filter((t) => t.done_at);
  return {
    goals: goals.map((g) => ({ id: g.id, title: g.title, status: g.status })),
    projects: rows(u, 'projects', 'domain = ?', slug).map((p) => ({ id: p.id, title: p.title, status: p.status })),
    deadlines: rows(u, 'deadlines', "domain = ? AND status = 'open'", slug).sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, 10).map((d) => ({ ...d, daysLeft: daysTo(d.due_at, now) })),
    habits: rows(u, 'habits', 'domain = ?', slug).map((h) => ({ id: h.id, title: h.title })),
    taskTotals: { open: tasks.length - done.length, done: done.length }, focusMinutes14d: domainMinutes(u, slug),
    memories: rows(u, 'notes', 'domain = ?', slug).length,
  };
}

/**
 * Academic-only gamification, DERIVED from real records (never stored): XP from finished academic work, coins from XP,
 * level from XP, streak from consecutive days with academic activity, and a boss quest = the nearest exam.
 */
function academicGame(u, assignments) {
  const tz = userTz(u);
  const doneTasks = rows(u, 'tasks', "domain IN ('academic','study') AND done_at IS NOT NULL");
  const sessions = rows(u, 'focus_sessions', "domain IN ('academic','study') AND status IN ('completed','stopped')");
  const results = rows(u, 'practice_results'); const submitted = assignments.filter((a) => ['submitted', 'graded'].includes(a.status));
  const focusMin = Math.round(sum(sessions, sessionMinutes));
  const xp = doneTasks.length * 10 + submitted.length * 25 + results.length * 20 + Math.floor(focusMin / 5);
  const days = new Set([...doneTasks.map((t) => dayKey(new Date(t.done_at), tz)), ...sessions.map((s) => dayKey(new Date(s.started_at), tz)), ...results.map((r) => dayKey(new Date(r.taken_at), tz))]);
  let streak = 0; let k = dayKey(new Date(), tz); if (!days.has(k)) k = addDays(k, -1); while (days.has(k)) { streak++; k = addDays(k, -1); }
  const level = Math.floor(Math.sqrt(xp / 50)) + 1; const next = 50 * level * level; const cur = 50 * (level - 1) * (level - 1);
  const exam = rows(u, 'exams').filter((e) => new Date(e.exam_at) > new Date()).sort((a, b) => a.exam_at.localeCompare(b.exam_at))[0] ?? null;
  const topics = exam?.subject_id ? rows(u, 'topics').filter((t) => t.subject_id === exam.subject_id) : [];
  return {
    xp, coins: Math.floor(xp / 10), level, levelProgress: next > cur ? (xp - cur) / (next - cur) : 0, xpToNext: next - xp, streak,
    formula: '10 XP per finished academic/study task, 25 per submitted assignment, 20 per test result, 1 per 5 focus minutes. 10 XP = 1 coin.',
    bossQuest: exam ? { id: exam.id, title: exam.title, daysLeft: daysTo(exam.exam_at), topics: topics.length, revised: topics.filter((t) => ['practiced', 'revised'].includes(t.status)).length } : null,
  };
}
