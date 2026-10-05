/**
 * Typed Agent tools. The model can ONLY call these — it never writes SQL or touches tables directly.
 * Every tool receives the authenticated userId from the server (never from model arguments) and goes through
 * the same validated CRUD layer as the UI, so user isolation and validation are enforced identically.
 *
 * risk: read    – executes immediately, no confirmation
 *       safe    – creates; executes immediately unless a plan is being proposed / user requires confirmation
 *       confirm – modifies existing data; always proposed → user approves → executed → verified
 *       strong  – destructive/irreversible; requires typed confirmation
 */
import { all, archive, complete, create, get, getSettings, list, remove, resolveDomain, update, userTz, HttpError } from '../crud.mjs';
import { ENTITIES } from '../schema.mjs';
import { addDays, dayKey, startOfDay, zonedToUtc } from '../tz.mjs';
import { achievements, calendarRange, capacity, compass, computeProgress, contextFor, goalHealth, habitsWithStats, patterns, planVsActual, projectHealth, rows, sessionMinutes, whyBehind } from '../derive.mjs';
import { searchAll } from '../services.mjs';

const A = { actor: 'agent' };
const S = (description, extra = {}) => ({ type: 'string', description, ...extra });
const N = (description) => ({ type: 'integer', description });
const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });

/** Accept ISO with offset, or a naive local "YYYY-MM-DD[THH:mm]" interpreted in the user's timezone. */
export function normTime(userId, v, { dateOnlyAt = 'noon' } = {}) {
  if (v === undefined || v === null || v === '') return v;
  const tz = userTz(userId); const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/);
  if (m) return zonedToUtc({ y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5] }, tz).toISOString();
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return zonedToUtc({ y: +m[1], m: +m[2], d: +m[3], h: dateOnlyAt === 'noon' ? 12 : 0 }, tz).toISOString();
  return s; // ISO with zone — validated downstream
}
const TIME_KEYS = ['due_at', 'start_at', 'end_at', 'exam_at', 'at', 'taken_at', 'performed_at'];
function prep(userId, args) {
  const o = { ...args };
  for (const k of TIME_KEYS) if (k in o) o[k] = normTime(userId, o[k]);
  if (o.domain) { const d = resolveDomain(userId, o.domain); if (!d) throw new HttpError(400, `Unknown domain "${o.domain}". Create it first with create_custom_domain or check get_domains.`); o.domain = d; }
  if ('due_at' in o && /^\d{4}-\d{2}-\d{2}$/.test(String(args.due_at)) && !('due_has_time' in o) && !('has_time' in o)) { /* date-only */ }
  return o;
}

const slim = (r, keys) => Object.fromEntries(keys.filter((k) => r[k] !== undefined && r[k] !== null && r[k] !== '').map((k) => [k, r[k]]));
const TASK_K = ['id', 'title', 'status', 'priority', 'domain', 'due_at', 'due_has_time', 'estimate_min', 'actual_min', 'done_at', 'goal_id', 'project_id', 'milestone_id', 'deadline_id', 'notes'];
const cap = (items, n = 40) => ({ count: items.length, items: items.slice(0, n), truncated: items.length > n });

/* ---------- common property sets ---------- */
const taskProps = {
  title: S('Task title'), notes: S('Notes'), domain: S('Domain: study, academic, work, fitness, finance, personal, or a custom domain name'), task_type: S('standard|deep_work|quick|admin|study|practice|revision|assignment|exam_prep|work_deliverable|meeting_prep|communication|call|email|errand|chore|purchase|payment|workout|recovery|personal|creative|research|review|planning|follow_up'), status: S('inbox|planned|in_progress|blocked|waiting|completed|cancelled|deferred'), energy: S('low|medium|high'), importance: N('1-5'), urgency: N('1-5'), priority: S('Priority', { enum: ['high', 'medium', 'low'] }),
  due_at: S('Due date-time. ISO-8601 with offset, or local "YYYY-MM-DDTHH:mm" (interpreted in the user timezone), or "YYYY-MM-DD" for a date-only due date'), due_has_time: { type: 'boolean' },
  estimate_min: N('Estimated effort in minutes'), goal_id: S('Goal id'), project_id: S('Project id'), milestone_id: S('Milestone id'), deadline_id: S('Deadline id'),
};
const patchOf = (props) => ({ id: S('Record id (from a read tool)'), ...props });

/* ---------- tool registry ---------- */
const tools = [];
const def = (t) => tools.push(t);

/* READ */
def({ name: 'get_tasks', risk: 'read', description: 'List tasks with filters. Returns ids needed for modifications.', parameters: obj({ status: S('open|done|all', { enum: ['open', 'done', 'all'] }), due_before: S('Date/time upper bound'), due_after: S('Date/time lower bound'), project_id: S('Project id'), goal_id: S('Goal id'), domain: S('Domain'), q: S('Text search'), limit: N('Max results (default 40)') }),
  run(u, a) {
    const f = {}; if (a.project_id) f.project_id = a.project_id; if (a.goal_id) f.goal_id = a.goal_id; if (a.domain) f.domain = a.domain;
    if ((a.status ?? 'open') === 'open') f.done_at = 'null'; else if (a.status === 'done') f.done_at = '!null';
    let items = all(u, 'tasks', { filters: f, q: a.q, sort: 'due_at:asc' });
    if (a.due_before) items = items.filter((t) => t.due_at && t.due_at < normTime(u, a.due_before)); if (a.due_after) items = items.filter((t) => t.due_at && t.due_at >= normTime(u, a.due_after));
    return cap(items.slice(0, a.limit ?? 40).map((t) => slim({ ...t, status: t.done_at ? 'done' : 'open' }, TASK_K)));
  } });
def({ name: 'get_goals', risk: 'read', description: 'List goals with derived progress and health.', parameters: obj({ status: S('Goal status filter'), domain: S('Domain') }),
  run(u, a) { const p = computeProgress(u); return cap(all(u, 'goals', { filters: { status: a.status, domain: a.domain } }).map((g) => ({ ...slim(g, ['id', 'title', 'why', 'domain', 'status', 'priority', 'horizon', 'target_date']), progress: Math.round((p.goals[g.id]?.progress ?? 0) * 100), health: goalHealth(u, g, p) }))); } });
def({ name: 'get_projects', risk: 'read', description: 'List projects with derived progress and health.', parameters: obj({ status: S('Project status filter'), goal_id: S('Goal id'), domain: S('Domain') }),
  run(u, a) { const p = computeProgress(u); return cap(all(u, 'projects', { filters: { status: a.status, goal_id: a.goal_id, domain: a.domain } }).map((x) => ({ ...slim(x, ['id', 'title', 'summary', 'domain', 'status', 'goal_id', 'due_at']), progress: Math.round((p.projects[x.id]?.progress ?? 0) * 100), health: projectHealth(u, x, p).state }))); } });
def({ name: 'get_milestones', risk: 'read', description: 'List milestones with derived progress.', parameters: obj({ project_id: S('Project id'), goal_id: S('Goal id'), open_only: { type: 'boolean' } }),
  run(u, a) { const p = computeProgress(u); const f = { project_id: a.project_id, goal_id: a.goal_id }; if (a.open_only) f.done_at = 'null'; return cap(all(u, 'milestones', { filters: f, sort: 'due_at:asc' }).map((m) => ({ ...slim(m, ['id', 'title', 'project_id', 'goal_id', 'due_at', 'done_at']), progress: Math.round((p.milestones[m.id]?.progress ?? 0) * 100) }))); } });
def({ name: 'get_deadlines', risk: 'read', description: 'List deadlines.', parameters: obj({ status: S('open|done|cancelled', { enum: ['open', 'done', 'cancelled'] }), within_days: N('Only deadlines due within N days from now') }),
  run(u, a) { let items = all(u, 'deadlines', { filters: { status: a.status ?? 'open' }, sort: 'due_at:asc' }); if (a.within_days) { const lim = new Date(Date.now() + a.within_days * 864e5).toISOString(); items = items.filter((d) => d.due_at <= lim); } return cap(items.map((d) => slim(d, ['id', 'title', 'due_at', 'has_time', 'priority', 'importance', 'consequence', 'estimate_min', 'status', 'goal_id', 'project_id', 'milestone_id', 'domain']))); } });
def({ name: 'get_calendar', risk: 'read', description: 'Events, deadlines, due tasks and focus in a range, plus conflicts. Dates are interpreted in the user timezone.', parameters: obj({ from: S('Start date or date-time'), to: S('End date or date-time (exclusive)') }, ['from', 'to']),
  run(u, a) { const c = calendarRange(u, new Date(normTime(u, a.from, { dateOnlyAt: 'start' })), new Date(normTime(u, a.to, { dateOnlyAt: 'start' }))); return { timezone: c.tz, ...cap(c.items.map((i) => slim(i, ['source', 'id', 'title', 'kind', 'domain', 'start', 'end', 'allDay', 'task_id', 'project_id', 'goal_id'])), 80), conflicts: c.conflicts }; } });
def({ name: 'get_habits', risk: 'read', description: 'Habits with streak and consistency derived from completion records.', parameters: obj({}),
  run(u) { return cap(habitsWithStats(u).map((h) => ({ ...slim(h, ['id', 'title', 'cadence', 'target_per_week', 'status', 'goal_id', 'domain']), streak: h.stats.streak, consistency: h.stats.consistency === null ? null : Math.round(h.stats.consistency * 100), doneToday: h.stats.doneToday }))); } });
def({ name: 'get_focus_history', risk: 'read', description: 'Recent focus sessions (actual minutes).', parameters: obj({ days: N('Look-back days (default 14)') }),
  run(u, a) { const since = new Date(Date.now() - (a.days ?? 14) * 864e5).toISOString(); const s = rows(u, 'focus_sessions', 'started_at >= ?', since); return { totalMinutes: Math.round(s.reduce((x, y) => x + sessionMinutes(y), 0)), ...cap(s.map((x) => ({ ...slim(x, ['id', 'started_at', 'planned_min', 'status', 'task_id', 'project_id', 'goal_id', 'domain']), actual_min: Math.round(sessionMinutes(x)) }))) }; } });
def({ name: 'get_capacity', risk: 'read', description: 'Realistic capacity: available − commitments − buffer − planned work, per day and domain.', parameters: obj({ from_day: S('YYYY-MM-DD (default today)'), days: N('Days (default 7, max 31)') }),
  run(u, a) { const c = capacity(u, a.from_day ?? dayKey(new Date(), userTz(u)), Math.min(a.days ?? 7, 31)); return { ...c, conflicts: c.conflicts.map((x) => `${x.a.title} overlaps ${x.b.title}`) }; } });
def({ name: 'get_progress', risk: 'read', description: 'Derived progress for goals, projects and milestones (0-100).', parameters: obj({}),
  run(u) { const p = computeProgress(u); const t = { goals: all(u, 'goals').map((g) => ({ id: g.id, title: g.title, progress: Math.round((p.goals[g.id]?.progress ?? 0) * 100) })), projects: all(u, 'projects').map((g) => ({ id: g.id, title: g.title, progress: Math.round((p.projects[g.id]?.progress ?? 0) * 100), ...p.projects[g.id] })) }; return t; } });
def({ name: 'get_patterns', risk: 'read', description: 'Evidence-backed behavioural patterns with confidence levels.', parameters: obj({}), run: (u) => patterns(u) });
def({ name: 'get_memories', risk: 'read', description: 'What LifeOS remembers about the user.', parameters: obj({ q: S('Search') }),
  run(u, a) { if (!getSettings(u).privacy.agentUsesMemory) return { items: [], note: 'The user disabled Agent access to memory.' }; return cap(all(u, 'memories', { q: a.q }).map((m) => slim(m, ['id', 'content', 'category', 'confidence', 'pinned']))); } });
def({ name: 'get_decisions', risk: 'read', description: 'Decisions and their reviews.', parameters: obj({ status: S('open|reviewed') }), run: (u, a) => cap(all(u, 'decisions', { filters: { status: a.status } }).map((d) => slim(d, ['id', 'title', 'chosen', 'expected', 'actual', 'learned', 'review_on', 'status']))) });
def({ name: 'get_reviews', risk: 'read', description: 'Past daily/weekly reviews.', parameters: obj({ kind: S('daily|weekly|monthly|quarterly') }), run: (u, a) => cap(all(u, 'reviews', { filters: { kind: a.kind }, sort: 'period_start:desc' }).slice(0, 10).map((r) => slim(r, ['id', 'kind', 'period_start', 'period_end', 'summary', 'answers']))) });
const DOMAIN_ENT = { study: ['subjects', 'topics', 'exams', 'study_resources', 'practice_results'], academic: ['subjects', 'exams', 'assignments'], work: ['clients', 'deliverables'], fitness: ['programs', 'workouts'], finance: ['finance_items'], personal: ['personal_items'] };
def({ name: 'get_domain_data', risk: 'read', description: 'Domain-specific records (study, academic, work, fitness, finance, personal) plus that domain\'s tasks/projects/goals.', parameters: obj({ domain: S('Domain id', { enum: Object.keys(DOMAIN_ENT) }) }, ['domain']),
  run(u, a) {
    const ents = DOMAIN_ENT[a.domain]; if (!ents) throw new HttpError(400, 'Unknown domain');
    const out = { domain: a.domain };
    for (const e of ents) out[e] = all(u, e, a.domain === 'academic' && e === 'subjects' ? { filters: { area: 'academic' } } : a.domain === 'study' && e === 'subjects' ? { filters: { area: 'study' } } : {}).slice(0, 30);
    if (a.domain === 'study') out.weakTopics = all(u, 'topics', { filters: { status: 'weak' } }).slice(0, 20);
    out.tasks = all(u, 'tasks', { filters: { domain: a.domain, done_at: 'null' } }).slice(0, 25).map((t) => slim(t, TASK_K));
    out.goals = all(u, 'goals', { filters: { domain: a.domain } }).map((g) => slim(g, ['id', 'title', 'status']));
    out.projects = all(u, 'projects', { filters: { domain: a.domain } }).map((g) => slim(g, ['id', 'title', 'status', 'due_at']));
    return out;
  } });
def({ name: 'search_lifeos', risk: 'read', description: 'Search across everything the user has stored.', parameters: obj({ q: S('Query') }, ['q']), run: (u, a) => searchAll(u, a.q, { limit: 6 }) });
def({ name: 'get_context', risk: 'read', description: 'Everything related to one record: parents, children, deadlines, focus, activity. Use to answer “everything about this goal / what affects this deadline”.', parameters: obj({ type: S('goals|projects|milestones|tasks|deadlines'), id: S('Record id') }, ['type', 'id']),
  run(u, a) { const c = contextFor(u, a.type, a.id); if (!c) throw new HttpError(404, 'Record not found'); return c; } });

/* ANALYSIS */
def({ name: 'analyze_goal_health', risk: 'read', description: 'Health of a goal: status, reasons, progress.', parameters: obj({ goal_id: S('Goal id') }, ['goal_id']), run: (u, a) => { const g = get(u, 'goals', a.goal_id); const p = computeProgress(u); return { goal: slim(g, ['id', 'title', 'status', 'target_date']), progress: Math.round((p.goals[g.id]?.progress ?? 0) * 100), ...goalHealth(u, g, p) }; } });
def({ name: 'analyze_project_health', risk: 'read', description: 'Why is a project behind? Facts from tasks, milestones, dependencies, effort and activity.', parameters: obj({ project_id: S('Project id') }, ['project_id']), run: (u, a) => whyBehind(u, a.project_id) ?? (() => { throw new HttpError(404, 'Project not found'); })() });
def({ name: 'compare_plan_vs_reality', risk: 'read', description: 'Estimated vs actual effort and planned vs actual focus.', parameters: obj({ days: N('Look-back days (default 14)') }), run: (u, a) => planVsActual(u, a.days ?? 14) });
def({ name: 'analyze_domain_balance', risk: 'read', description: 'Where time actually went by domain and goal, neglected goals, planned vs actual.', parameters: obj({ days: N('Look-back days (default 14)') }), run: (u, a) => compass(u, a.days ?? 14) });
def({ name: 'analyze_progress', risk: 'read', description: 'Achievements and derived progress overview.', parameters: obj({}), run: (u) => ({ achievements: achievements(u).filter((x) => x.achieved).map((x) => x.title), progress: computeProgress(u) }) });

/* CREATE (safe) */
const creator = (name, entity, description, props, required) => def({ name, risk: 'safe', entity, op: 'create', description, parameters: obj(props, required), run: (u, a) => create(u, entity, prep(u, a), A) });
creator('create_task', 'tasks', 'Create a task.', taskProps, ['title']);
creator('create_deadline', 'deadlines', 'Create a deadline.', { title: S('Title'), due_at: S('Due date-time (see get_calendar conventions)'), has_time: { type: 'boolean' }, priority: S('Priority', { enum: ['high', 'medium', 'low'] }), importance: N('1-5'), consequence: S('What happens if missed'), estimate_min: N('Effort minutes'), goal_id: S('Goal id'), project_id: S('Project id'), milestone_id: S('Milestone id'), domain: S('Domain') }, ['title', 'due_at']);
creator('create_goal', 'goals', 'Create a goal. For measurable goals set measure_type, target_value, unit, direction and method (measurements = user logs values with log_measurement; focus = tracked focus time; habits = linked habits; work = derived from linked tasks/projects).', { goal_type: S('outcome|performance|process|learning|academic|career|financial|fitness|health|habit|savings|revenue|exam|grade|reading|custom…'), measure_type: S('binary|count|percentage|currency|duration|distance|weight|score|rating|frequency|streak|quantity|ratio|milestones|numeric'), direction: S('increase|decrease|maintain|achieve'), method: S('work|measurements|habits|focus'), baseline: { type: 'number' }, target_value: { type: 'number' }, unit: S('e.g. INR, km, kg, hours'), start_date: S('YYYY-MM-DD'), title: S('Title'), why: S('Why it matters'), domain: S('Domain'), horizon: S('e.g. "This quarter"'), priority: N('1 (top) to 3'), target_date: S('YYYY-MM-DD') }, ['title']);
creator('create_project', 'projects', 'Create a project.', { title: S('Title'), summary: S('Summary'), domain: S('Domain'), goal_id: S('Goal id'), status: S('Status', { enum: ['planning', 'active'] }), due_at: S('Due') }, ['title']);
creator('create_milestone', 'milestones', 'Create a milestone.', { title: S('Title'), project_id: S('Project id'), goal_id: S('Goal id'), due_at: S('Due') }, ['title']);
creator('create_event', 'events', 'Create a calendar event.', { title: S('Title'), start_at: S('Start'), end_at: S('End'), kind: S('Kind', { enum: ['event', 'appointment', 'time_block'] }), domain: S('Domain'), place: S('Place'), goal_id: S('Goal id'), project_id: S('Project id'), task_id: S('Task id') }, ['title', 'start_at']);
creator('create_habit', 'habits', 'Create a habit.', { title: S('Title'), cadence: S('daily|weekly|custom', { enum: ['daily', 'weekly', 'custom'] }), target_per_week: N('For weekly cadence, 1-7'), days: { type: 'array', items: { type: 'integer' }, description: 'Custom weekdays 0=Sun..6=Sat' }, domain: S('Domain'), goal_id: S('Goal id') }, ['title']);
def({ name: 'create_focus_block', risk: 'safe', entity: 'events', op: 'create', description: 'Reserve a focus block on the calendar (optionally for a task).', parameters: obj({ title: S('Title'), start_at: S('Start'), duration_min: N('Minutes'), task_id: S('Task id'), project_id: S('Project id'), goal_id: S('Goal id'), domain: S('Domain') }, ['start_at', 'duration_min']),
  run(u, a) { const start = normTime(u, a.start_at); return create(u, 'events', { title: a.title ?? 'Focus block', kind: 'focus_block', start_at: start, end_at: new Date(new Date(start).getTime() + a.duration_min * 60000).toISOString(), task_id: a.task_id, project_id: a.project_id, goal_id: a.goal_id, domain: a.domain }, A); } });
creator('create_note', 'notes', 'Create a note.', { title: S('Title'), body: S('Body'), domain: S('Domain'), goal_id: S('Goal id'), project_id: S('Project id') }, ['title']);
def({ name: 'create_review', risk: 'safe', entity: 'reviews', op: 'create', description: 'Create/save a review.', parameters: obj({ kind: S('daily|weekly|monthly|quarterly', { enum: ['daily', 'weekly', 'monthly', 'quarterly'] }), period_start: S('YYYY-MM-DD'), period_end: S('YYYY-MM-DD'), summary: S('Summary'), answers: { type: 'object', description: 'Free-form answers keyed by question' } }, ['kind', 'period_start', 'period_end']), run: (u, a) => create(u, 'reviews', a, A) });
creator('create_experiment', 'experiments', 'Create a draft experiment.', { title: S('Title'), hypothesis: S('Hypothesis'), duration_days: N('Days'), measures: { type: 'array', items: { type: 'string' } } }, ['title']);
creator('create_decision', 'decisions', 'Log a decision.', { title: S('Title'), context: S('Context'), options: { type: 'array', items: { type: 'string' } }, chosen: S('Chosen option'), reasoning: S('Reasoning'), expected: S('Expected outcome'), review_on: S('YYYY-MM-DD') }, ['title']);
def({ name: 'create_memory', risk: 'safe', entity: 'memories', op: 'create', description: 'Remember something the user explicitly asked you to remember (or a clear stable preference). The user can inspect and delete it.', parameters: obj({ content: S('The memory'), category: S('Category', { enum: ['fact', 'preference', 'rule', 'lesson', 'context'] }) }, ['content']), run: (u, a) => create(u, 'memories', { ...a, source: 'agent', confidence: 80 }, A) });

def({ name: 'get_domains', risk: 'read', description: 'Built-in and custom domains with open task/goal counts.', parameters: obj({}),
  run: (u) => ({ builtin: ['academic', 'study', 'work', 'fitness', 'finance', 'personal'], custom: all(u, 'custom_domains').map((d) => ({ id: d.id, slug: d.slug, name: d.name, category: d.category, status: d.status })) }) });
const PAGES = { today: '/', capture: '/capture', calendar: '/calendar', deadlines: '/deadlines', goals: '/goals', projects: '/projects', milestones: '/milestones', tasks: '/tasks', habits: '/habits', focus: '/focus', progress: '/progress', capacity: '/capacity', compass: '/compass', experiments: '/experiments', patterns: '/patterns', review: '/review', timeline: '/timeline', memory: '/memory', accomplishments: '/accomplishments', decisions: '/decisions', map: '/map', search: '/search', create: '/create', academic: '/academic', study: '/study', work: '/work', fitness: '/fitness', finance: '/finance', personal: '/personal', achievements: '/achievements', alerts: '/alerts', connect: '/connect', settings: '/settings' };
def({ name: 'open_page', risk: 'read', description: 'Navigate the user to a LifeOS page. Returns a link the UI shows as a button.', parameters: obj({ page: S('Page name', { enum: Object.keys(PAGES) }), custom_domain: S('Custom domain slug (opens /domain/<slug>)') }, []),
  run: (u, a) => ({ path: a.custom_domain ? `/domain/${a.custom_domain}` : PAGES[a.page] ?? '/' }) });
def({ name: 'create_custom_domain', risk: 'safe', entity: 'custom_domains', op: 'create', description: 'Create a user-defined domain (e.g. Business, Music, Travel). Afterwards pass its name as `domain` to other create tools.', parameters: obj({ name: S('Domain name'), icon: S('Icon name, e.g. briefcase, book, leaf, plane, users, home, layers'), color: S('purple|royal|lavender|plum|slate|mist|sand'), description: S('Description'), category: S('Category') }, ['name']), run: (u, a) => create(u, 'custom_domains', a, A) });
creator('create_accomplishment', 'accomplishments', 'Record an accomplishment (life receipt) with evidence. Only for things the user says actually happened.', { title: S('Title'), description: S('Details'), achieved_on: S('YYYY-MM-DD'), domain: S('Domain'), kind: S('win|certification|milestone|work|personal'), evidence: S('Evidence'), goal_id: S('Goal id'), project_id: S('Project id'), before_value: S('Before'), after_value: S('After'), outcome: S('Outcome') }, ['title', 'achieved_on']);
creator('log_measurement', 'measurements', 'Log an actual measured value for a goal (weight, savings deposit, km run, test score…). Progress is computed from these.', { goal_id: S('Goal id'), name: S('What was measured'), value: { type: 'number' }, unit: S('Unit'), at: S('When (default: now)') }, ['goal_id', 'name', 'value']);
creator('create_flashcard', 'study_resources', 'Create one flashcard (kind=flashcard): title is the front, body the back.', { kind: S('flashcard', { enum: ['flashcard'] }), title: S('Front / question'), body: S('Back / answer'), subject_id: S('Subject id'), topic_id: S('Topic id') }, ['title', 'body']);
creator('create_quiz', 'study_resources', 'Save a quiz (kind=quiz): body holds numbered questions with answers.', { kind: S('quiz', { enum: ['quiz'] }), title: S('Quiz title'), body: S('Questions and answers'), subject_id: S('Subject id'), topic_id: S('Topic id') }, ['title', 'body']);
creator('create_study_item', 'study_resources', 'Save study material: note, formula, question, paper, bookmark.', { kind: S('note|formula|question|paper|bookmark'), title: S('Title'), body: S('Body'), subject_id: S('Subject id'), topic_id: S('Topic id') }, ['title']);

/* MODIFY (confirm) */
const modifier = (name, entity, description, props, required = ['id'], map) => def({ name, risk: 'confirm', entity, op: 'update', description, parameters: obj(props, required),
  run(u, a) { const { id, ...patch } = prep(u, a); return update(u, entity, id, map ? map(patch) : patch, A); } });
modifier('update_task', 'tasks', 'Edit a task.', patchOf(taskProps));
modifier('reschedule_task', 'tasks', 'Change when a task is due.', { id: S('Task id'), due_at: S('New due'), due_has_time: { type: 'boolean' } }, ['id', 'due_at']);
modifier('reschedule_deadline', 'deadlines', 'Change a deadline date/time.', { id: S('Deadline id'), due_at: S('New due'), has_time: { type: 'boolean' } }, ['id', 'due_at']);
modifier('reschedule_event', 'events', 'Move a calendar event.', { id: S('Event id'), start_at: S('New start'), end_at: S('New end') }, ['id', 'start_at']);
modifier('update_project', 'projects', 'Edit a project.', patchOf({ title: S('Title'), summary: S('Summary'), status: S('Status', { enum: ['planning', 'active', 'blocked', 'paused', 'completed', 'archived'] }), due_at: S('Due'), blocked_reason: S('Why blocked') }));
modifier('move_milestone', 'milestones', 'Move a milestone date or to another project.', { id: S('Milestone id'), due_at: S('New due'), project_id: S('New project id') }, ['id']);
modifier('update_goal', 'goals', 'Edit a goal (including pause/resume/complete via status). Progress cannot be set directly — it is derived.', patchOf({ target_value: { type: 'number' }, unit: S('Unit'), direction: S('increase|decrease|maintain|achieve'), domain: S('Domain'), title: S('Title'), why: S('Why'), status: S('Status', { enum: ['active', 'paused', 'completed', 'abandoned', 'at_risk'] }), priority: N('1-3'), target_date: S('YYYY-MM-DD') }));
modifier('update_deadline', 'deadlines', 'Edit a deadline (status open|done|cancelled, importance, consequence…).', patchOf({ title: S('Title'), status: S('open|done|cancelled'), importance: N('1-5'), consequence: S('Consequence'), outcome: S('Outcome'), notes: S('Notes') }));
modifier('update_habit', 'habits', 'Edit a habit.', patchOf({ title: S('Title'), cadence: S('Cadence', { enum: ['daily', 'weekly', 'custom'] }), target_per_week: N('1-7'), status: S('Status', { enum: ['active', 'paused', 'archived'] }) }));
def({ name: 'complete_task', risk: 'confirm', entity: 'tasks', op: 'complete', description: 'Mark a task done.', parameters: obj({ id: S('Task id') }, ['id']), run: (u, a) => complete(u, 'tasks', a.id, A) });
def({ name: 'schedule_focus', risk: 'confirm', entity: 'events', op: 'create', description: 'Schedule a focus block for existing work (proposed for approval).', parameters: obj({ title: S('Title'), start_at: S('Start'), duration_min: N('Minutes'), task_id: S('Task id'), project_id: S('Project id') }, ['start_at', 'duration_min']),
  run(u, a) { const start = normTime(u, a.start_at); return create(u, 'events', { title: a.title ?? 'Focus block', kind: 'focus_block', start_at: start, end_at: new Date(new Date(start).getTime() + a.duration_min * 60000).toISOString(), task_id: a.task_id, project_id: a.project_id }, A); } });
def({ name: 'reorganize_plan', risk: 'confirm', entity: null, op: 'batch', description: 'Propose a batch of schedule changes at once. Each operation names an allowed create/modify tool and its arguments. Nothing runs until the user approves.', parameters: obj({ operations: { type: 'array', items: obj({ tool: S('create_* / update_* / reschedule_* / move_milestone / complete_task / schedule_focus'), args: { type: 'object' } }, ['tool', 'args']) } }, ['operations']), run() { throw new Error('batch is expanded before execution'); } });
const DELETABLE = ['tasks', 'goals', 'projects', 'milestones', 'deadlines', 'events', 'habits', 'notes', 'memories', 'decisions', 'experiments'];
def({ name: 'delete_item', risk: 'strong', entity: null, op: 'delete', description: 'PERMANENTLY delete a record. Irreversible. Prefer archiving via update tools. Requires the user to type DELETE.', parameters: obj({ entity: S('Entity', { enum: DELETABLE }), id: S('Record id') }, ['entity', 'id']),
  run(u, a) { if (!DELETABLE.includes(a.entity)) throw new HttpError(400, 'Not deletable'); return remove(u, a.entity, a.id, A); } });
def({ name: 'archive_item', risk: 'confirm', entity: null, op: 'archive', description: 'Archive (soft-delete, restorable) a record.', parameters: obj({ entity: S('Entity', { enum: DELETABLE }), id: S('Record id') }, ['entity', 'id']), run: (u, a) => { if (!DELETABLE.includes(a.entity)) throw new HttpError(400, 'Not archivable'); return archive(u, a.entity, a.id, A); } });

export const TOOLS = tools;
export const toolByName = (n) => tools.find((t) => t.name === n);
export const toolDefs = () => tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
export const ALLOWED_IN_BATCH = new Set(tools.filter((t) => ['safe', 'confirm'].includes(t.risk) && t.name !== 'reorganize_plan').map((t) => t.name));

/** Human readable one-liner for the confirmation UI. */
export function describeOp(u, name, args) {
  const t = args.title ? `“${args.title}”` : '';
  const nameOf = (entity, id) => { try { const r = get(u, entity, id); return `“${r.title ?? r.name ?? r.content}”`; } catch { return `(${entity} ${id})`; } };
  const when = (v) => (v ? new Date(normTime(u, v)).toLocaleString('en-US', { timeZone: userTz(u), weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  const tool = toolByName(name); const ent = tool?.entity;
  switch (name) {
    case 'complete_task': return `Complete ${nameOf('tasks', args.id)}`;
    case 'reschedule_task': return `Move task ${nameOf('tasks', args.id)} to ${when(args.due_at)}`;
    case 'reschedule_deadline': return `Move deadline ${nameOf('deadlines', args.id)} to ${when(args.due_at)}`;
    case 'reschedule_event': return `Move ${nameOf('events', args.id)} to ${when(args.start_at)}`;
    case 'move_milestone': return `Move milestone ${nameOf('milestones', args.id)}${args.due_at ? ` to ${when(args.due_at)}` : ''}`;
    case 'schedule_focus': case 'create_focus_block': return `Reserve ${args.duration_min}-min focus block ${when(args.start_at)}${args.title ? ` — ${args.title}` : ''}`;
    case 'delete_item': return `PERMANENTLY delete ${nameOf(args.entity, args.id)} (${args.entity})`;
    case 'archive_item': return `Archive ${nameOf(args.entity, args.id)} (${args.entity})`;
    default:
      if (tool?.op === 'create') return `Create ${ENTITIES[ent]?.label.toLowerCase() ?? 'item'} ${t}${args.due_at ? ` due ${when(args.due_at)}` : args.start_at ? ` at ${when(args.start_at)}` : ''}`;
      if (tool?.op === 'update') return `Edit ${nameOf(ent, args.id)}: ${Object.keys(args).filter((k) => k !== 'id').join(', ')}`;
      return name;
  }
}

/** Execute one op and verify by reading the record back. Returns {before, after, verified}. Throws on failure. */
export function executeVerified(u, name, args) {
  const tool = toolByName(name); if (!tool) throw new HttpError(400, `Unknown tool ${name}`);
  const entity = tool.entity ?? args.entity; let before = null;
  if (['update', 'complete', 'archive', 'delete'].includes(tool.op)) before = get(u, entity, args.id);
  const res = tool.run(u, args);
  if (tool.op === 'delete') {
    let exists = true; try { get(u, entity, args.id); } catch { exists = false; }
    if (exists) throw new Error('Verification failed: record still exists after delete');
    return { entity, id: args.id, op: 'delete', before, after: null, verified: true };
  }
  const id = res.id; const after = get(u, entity, id);
  if (tool.op === 'create') { const t = args.title ?? args.content; if (t && String(after.title ?? after.content).trim() !== String(t).trim()) throw new Error('Verification failed: created record does not match'); }
  if (tool.op === 'update') {
    const p = prep(u, args);
    for (const [k, v] of Object.entries(p)) { if (k === 'id' || !(k in ENTITIES[entity].fields)) continue; const got = after[k]; const same = ['due_at', 'start_at', 'end_at'].includes(k) ? new Date(got).getTime() === new Date(v).getTime() : JSON.stringify(got) === JSON.stringify(v) || String(got) === String(v); if (!same) throw new Error(`Verification failed: ${k} was not saved`); }
  }
  if (tool.op === 'complete' && !(after.done_at || after.status === 'completed')) throw new Error('Verification failed: task is not complete');
  return { entity, id, op: tool.op, before, after, verified: true };
}

void addDays; void startOfDay; void list;
