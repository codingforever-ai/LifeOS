/**
 * LifeOS entity specs — the single declarative source for tables, validation and the generic CRUD engine.
 * Every table gets: id, user_id, created_at, updated_at, archived_at. user_id is NEVER client-writable.
 * Derived values (progress, streaks, capacity…) are deliberately NOT columns — see derive.mjs.
 */
const str = (max = 200, o = {}) => ({ t: 'str', max, ...o });
const text = (max = 8000, o = {}) => ({ t: 'text', max, ...o });
const int = (min = 0, max = 1_000_000, o = {}) => ({ t: 'int', min, max, ...o });
const real = (o = {}) => ({ t: 'real', ...o });
const bool = (o = {}) => ({ t: 'bool', ...o });
const en = (values, def, o = {}) => ({ t: 'enum', values, def, ...o });
const ts = (o = {}) => ({ t: 'ts', ...o }); // ISO-8601 instant
const day = (o = {}) => ({ t: 'day', ...o }); // YYYY-MM-DD (floating date)
const json = (max = 8000, o = {}) => ({ t: 'json', max, ...o });
const ref = (to, o = {}) => ({ t: 'ref', to, ...o });

const PRIORITY = ['high', 'medium', 'low'];
const DOMAIN = str(40, { def: 'personal' });
const RECUR = json(400); // {freq:'daily'|'weekly'|'monthly'|'yearly', interval:n, until?:'YYYY-MM-DD'}

export const ENTITIES = {
  goals: {
    label: 'Goal',
    fields: {
      title: str(200, { req: true }), why: text(2000), domain: DOMAIN, horizon: str(60),
      status: en(['active', 'paused', 'completed', 'abandoned', 'at_risk'], 'active'),
      priority: int(1, 3, { def: 2 }), target_date: day(), notes: text(),
      // Measurement model — current value & progress are DERIVED (derive.mjs) from measurements / linked work, never stored.
      goal_type: en(['outcome','performance','process','learning','academic','career','financial','fitness','health','habit','relationship','personal','creative','project','experience','lifestyle','skill','business','savings','revenue','debt','exam','grade','reading','time','frequency','quantity','completion','custom'], 'outcome'), measure_type: en(['binary','count','percentage','currency','duration','distance','weight','score','rating','frequency','streak','quantity','ratio','milestones','numeric'], 'milestones'), direction: en(['increase', 'decrease', 'maintain', 'achieve'], 'increase'),
      method: en(['work', 'measurements', 'habits', 'focus'], 'work'), baseline: real(), target_value: real(), unit: str(20), start_date: day(),
      confidence: int(0, 100), parent_id: ref('goals'), is_vision: bool({ def: false }),
    },
    search: ['title', 'why', 'notes'], completion: { status: 'status', done: 'completed', open: 'active' },
  },
  projects: {
    label: 'Project',
    fields: {
      title: str(200, { req: true }), summary: text(2000), domain: DOMAIN, goal_id: ref('goals'),
      status: en(['planning', 'active', 'blocked', 'paused', 'completed', 'archived'], 'planning'),
      due_at: ts(), notes: text(), blocked_reason: str(300), priority: en(PRIORITY, 'medium'), start_date: day(), outcome: text(2000), depends_on_id: ref('projects'),
    },
    search: ['title', 'summary', 'notes'], completion: { status: 'status', done: 'completed', open: 'active' },
  },
  milestones: {
    label: 'Milestone',
    fields: {
      title: str(200, { req: true }), project_id: ref('projects'), goal_id: ref('goals'), deadline_id: ref('deadlines'),
      due_at: ts(), done_at: ts({ system: true }), position: int(0, 10000, { def: 0 }), notes: text(), domain: DOMAIN, target_text: str(300), outcome: text(2000),
    },
    search: ['title', 'notes'], completion: { at: 'done_at' },
  },
  tasks: {
    label: 'Task',
    fields: {
      title: str(300, { req: true }), notes: text(), domain: DOMAIN, priority: en(PRIORITY, 'medium'),
      due_at: ts(), due_has_time: bool({ def: false }), estimate_min: int(0, 6000), actual_min: int(0, 6000),
      done_at: ts({ system: true }), goal_id: ref('goals'), project_id: ref('projects'), milestone_id: ref('milestones'),
      deadline_id: ref('deadlines'), parent_id: ref('tasks'), tags: json(500), recurrence: RECUR, reminder_min: int(0, 100000),
      task_type: en(['standard', 'deep_work', 'quick', 'admin', 'study', 'practice', 'revision', 'assignment', 'exam_prep', 'work_deliverable', 'meeting_prep', 'communication', 'call', 'email', 'errand', 'chore', 'purchase', 'payment', 'workout', 'recovery', 'personal', 'creative', 'research', 'review', 'planning', 'habit_task', 'follow_up', 'recurring', 'milestone_task'], 'standard'),
      status: en(['inbox', 'planned', 'in_progress', 'blocked', 'waiting', 'completed', 'cancelled', 'deferred'], 'planned'),
      start_at: ts(), importance: int(1, 5), urgency: int(1, 5), energy: en(['low', 'medium', 'high'], 'medium'), context: str(80), location: str(200), blocker: str(300),
    },
    search: ['title', 'notes'], completion: { status: 'status', done: 'completed', open: 'planned', at: 'done_at' },
  },
  task_dependencies: {
    label: 'Task dependency',
    fields: { task_id: ref('tasks', { req: true }), depends_on_id: ref('tasks', { req: true }) },
    search: [],
  },
  deadlines: {
    label: 'Deadline',
    fields: {
      title: str(200, { req: true }), due_at: ts({ req: true }), has_time: bool({ def: true }), tz: str(64),
      priority: en(PRIORITY, 'medium'), importance: int(1, 5, { def: 3 }), consequence: str(500), estimate_min: int(0, 100000),
      status: en(['open', 'done', 'cancelled'], 'open'), recurrence: RECUR, reminder_min: int(0, 100000),
      goal_id: ref('goals'), project_id: ref('projects'), milestone_id: ref('milestones'), domain: DOMAIN,
      notes: text(), completed_at: ts({ system: true }),
      type: en(['exam', 'assignment', 'project', 'deliverable', 'bill', 'payment', 'appointment', 'application', 'renewal', 'travel', 'event', 'commitment', 'milestone', 'challenge', 'order', 'repair', 'medical', 'responsibility', 'other'], 'commitment'),
      outcome: text(2000), blocker: str(300), depends_on_id: ref('deadlines'),
    },
    search: ['title', 'notes', 'consequence'], completion: { status: 'status', done: 'done', open: 'open', at: 'completed_at' },
  },
  events: {
    label: 'Event',
    fields: {
      title: str(200, { req: true }), start_at: ts({ req: true }), end_at: ts(), all_day: bool({ def: false }),
      kind: en(['event', 'appointment', 'focus_block', 'time_block'], 'event'), domain: DOMAIN,
      goal_id: ref('goals'), project_id: ref('projects'), task_id: ref('tasks'), place: str(200), recurrence: RECUR, notes: text(),
    },
    search: ['title', 'place', 'notes'],
  },
  habits: {
    label: 'Habit',
    fields: {
      title: str(200, { req: true }), domain: DOMAIN, goal_id: ref('goals'),
      cadence: en(['daily', 'weekly', 'custom'], 'daily'), target_per_week: int(1, 7, { def: 3 }),
      days: json(100), // custom: weekday numbers 0-6 (Sun=0)
      status: en(['active', 'paused', 'archived'], 'active'), reminder_time: str(5), notes: text(),
      kind: en(['binary', 'quantity', 'duration'], 'binary'), target_value: real(), unit: str(20), counts_to_goal: bool({ def: false }),
    },
    search: ['title', 'notes'],
  },
  habit_completions: {
    label: 'Habit completion',
    fields: { habit_id: ref('habits', { req: true }), day: day({ req: true }), status: en(['done', 'skipped'], 'done'), note: str(300), value: real() },
    search: [], unique: ['habit_id', 'day'],
  },
  focus_sessions: {
    label: 'Focus session',
    fields: {
      task_id: ref('tasks'), project_id: ref('projects'), goal_id: ref('goals'), domain: str(40),
      planned_min: int(1, 600, { req: true }), started_at: ts({ system: true }), ended_at: ts({ system: true }),
      accumulated_ms: int(0, 1e12, { system: true, def: 0 }), running_since: ts({ system: true }),
      status: en(['running', 'paused', 'completed', 'stopped'], 'running', { system: true }), note: text(2000),
      kind: en(['pomodoro', 'deep_work', 'study', 'work', 'workout', 'custom'], 'deep_work'), interruptions: int(0, 1000, { def: 0 }),
    },
    search: ['note'],
  },
  notes: {
    label: 'Note',
    fields: { title: str(200, { req: true }), body: text(20000), domain: DOMAIN, goal_id: ref('goals'), project_id: ref('projects'), pinned: bool({ def: false }) },
    search: ['title', 'body'],
  },
  inbox: {
    label: 'Capture',
    fields: {
      kind: en(['task', 'thought', 'idea', 'reminder', 'note', 'link', 'image', 'document', 'voice', 'deadline', 'event', 'goal', 'project', 'decision', 'reflection', 'memory', 'resource', 'commitment'], 'thought'),
      content: text(10000, { req: true }), url: str(2000), title: str(200), tags: json(500), domain: str(40), source: str(60), due_at: ts(),
      status: en(['new', 'processed', 'dismissed'], 'new'), resolved_type: str(40), resolved_id: str(40),
    },
    search: ['content', 'url'],
  },
  reviews: {
    label: 'Review',
    fields: {
      kind: en(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], 'daily'), period_start: day({ req: true }), period_end: day({ req: true }),
      answers: json(20000), summary: text(4000),
    },
    search: ['summary', 'answers'], unique: ['kind', 'period_start'],
  },
  experiments: {
    label: 'Experiment',
    fields: {
      title: str(200, { req: true }), hypothesis: text(2000), duration_days: int(1, 365, { def: 14 }), measures: json(1000),
      status: en(['draft', 'running', 'completed', 'archived'], 'draft'), started_at: ts({ system: true }), conclusion: text(4000),
    },
    search: ['title', 'hypothesis', 'conclusion'],
  },
  experiment_observations: {
    label: 'Observation',
    fields: { experiment_id: ref('experiments', { req: true }), day: day({ req: true }), note: text(1000), value: real(), measure: str(80) },
    search: ['note'],
  },
  decisions: {
    label: 'Decision',
    fields: {
      title: str(200, { req: true }), context: text(4000), options: json(4000), chosen: str(300), reasoning: text(4000),
      expected: text(2000), actual: text(2000), review_on: day(), status: en(['open', 'reviewed'], 'open'), learned: text(2000), domain: DOMAIN, assumptions: text(2000), decided_on: day(),
    },
    search: ['title', 'context', 'reasoning', 'actual', 'learned'],
  },
  memories: {
    label: 'Memory',
    fields: {
      content: text(2000, { req: true }), category: en(['fact', 'preference', 'principle', 'rule', 'lesson', 'decision', 'event', 'relationship', 'context', 'insight', 'note'], 'fact'),
      link_type: str(40), link_id: str(40), context: str(500),
      source: en(['user', 'agent', 'review'], 'user'), confidence: int(0, 100, { def: 100 }), pinned: bool({ def: false }),
    },
    search: ['content'],
  },
  accomplishments: {
    label: 'Accomplishment',
    fields: {
      title: str(200, { req: true }), description: text(4000), domain: DOMAIN, achieved_on: day({ req: true }),
      kind: en(['win', 'certification', 'milestone', 'work', 'personal'], 'win'), evidence_url: str(2000),
      goal_id: ref('goals'), project_id: ref('projects'), task_id: ref('tasks'), evidence: text(2000), before_value: str(100), after_value: str(100), outcome: text(2000),
    },
    search: ['title', 'description'],
  },
  measurements: {
    label: 'Measurement',
    fields: { goal_id: ref('goals'), name: str(100, { req: true }), value: real({ req: true }), unit: str(20), at: ts({ req: true }), domain: str(40) },
    search: ['name'],
  },
  alerts: {
    label: 'Alert',
    fields: {
      kind: str(40, { req: true }), title: str(300, { req: true }), body: str(1000), priority: en(PRIORITY, 'medium'),
      read_at: ts(), dismissed_at: ts(), snoozed_until: ts(), ref_type: str(40), ref_id: str(40), dedupe_key: str(200),
    },
    search: ['title'],
  },
  // ---- Study / Academic ----
  subjects: {
    label: 'Subject',
    fields: { name: str(120, { req: true }), area: en(['study', 'academic'], 'study'), color: str(20), notes: text(), exam_id: ref('exams') },
    search: ['name', 'notes'],
  },
  chapters: {
    label: 'Chapter',
    fields: { subject_id: ref('subjects', { req: true }), title: str(200, { req: true }), position: int(0, 10000, { def: 0 }), weight: int(0, 100) },
    search: ['title'],
  },
  topics: {
    label: 'Topic',
    fields: {
      chapter_id: ref('chapters', { req: true }), subject_id: ref('subjects'), title: str(200, { req: true }),
      status: en(['new', 'studying', 'practiced', 'weak', 'revised'], 'new'), confidence: int(0, 5, { def: 0 }),
      last_studied: ts(), next_revision: day(), bookmarked: bool({ def: false }),
    },
    search: ['title'],
  },
  exams: {
    label: 'Exam',
    fields: { title: str(200, { req: true }), subject_id: ref('subjects'), exam_at: ts({ req: true }), deadline_id: ref('deadlines'), syllabus: text(4000), result: str(100) },
    search: ['title', 'syllabus'],
  },
  assignments: {
    label: 'Assignment',
    fields: { title: str(200, { req: true }), subject_id: ref('subjects'), due_at: ts({ req: true }), status: en(['todo', 'in_progress', 'submitted', 'graded'], 'todo'), grade: str(40), notes: text(), deadline_id: ref('deadlines') },
    search: ['title', 'notes'],
  },
  practice_results: {
    label: 'Practice result',
    fields: { subject_id: ref('subjects'), topic_id: ref('topics'), kind: en(['practice', 'mock', 'paper'], 'practice'), score: real({ req: true }), total: real({ req: true }), taken_at: ts({ req: true }), duration_min: int(0, 1000), notes: text(1000) },
    search: ['notes'],
  },
  study_resources: {
    label: 'Study resource',
    fields: {
      kind: en(['note', 'formula', 'question', 'paper', 'bookmark', 'flashcard', 'quiz', 'mock_test'], 'note'), title: str(200, { req: true }), body: text(20000), url: str(2000),
      subject_id: ref('subjects'), topic_id: ref('topics'), bookmarked: bool({ def: false }),
    },
    search: ['title', 'body'],
  },
  // ---- Work ----
  clients: { label: 'Client', fields: { name: str(160, { req: true }), notes: text(), status: en(['active', 'paused', 'closed'], 'active') }, search: ['name', 'notes'] },
  deliverables: {
    label: 'Deliverable',
    fields: { title: str(200, { req: true }), client_id: ref('clients'), project_id: ref('projects'), due_at: ts(), status: en(['todo', 'in_progress', 'review', 'delivered'], 'todo'), outcome: text(2000), deadline_id: ref('deadlines') },
    search: ['title', 'outcome'],
  },
  // ---- Fitness ----
  programs: { label: 'Program', fields: { title: str(200, { req: true }), goal_id: ref('goals'), status: en(['active', 'paused', 'completed'], 'active'), notes: text() }, search: ['title', 'notes'] },
  workouts: {
    label: 'Workout',
    fields: { program_id: ref('programs'), title: str(200, { req: true }), performed_at: ts({ req: true }), duration_min: int(0, 600), recovery: int(1, 5), notes: text() },
    search: ['title', 'notes'],
  },
  exercise_sets: {
    label: 'Set',
    fields: { workout_id: ref('workouts', { req: true }), exercise: str(120, { req: true }), reps: int(0, 1000), weight: real(), rpe: int(1, 10) },
    search: ['exercise'],
  },
  // ---- Finance (user-entered only; no bank integration, no account numbers) ----
  finance_items: {
    label: 'Finance item',
    fields: {
      kind: en(['goal', 'saving', 'spending', 'commitment', 'recurring', 'plan'], 'commitment'), title: str(200, { req: true }),
      amount_minor: int(0, 1e12), currency: str(3, { def: 'INR' }), due_at: ts(), recurrence: RECUR, status: en(['open', 'done'], 'open'), notes: text(),
    },
    search: ['title', 'notes'],
  },
  // ---- Personal ----
  personal_items: {
    label: 'Personal item',
    fields: {
      kind: en(['errand', 'appointment', 'household', 'relationship', 'travel', 'admin'], 'errand'), title: str(200, { req: true }),
      due_at: ts(), status: en(['open', 'done'], 'open'), notes: text(),
    },
    search: ['title', 'notes'],
  },
  // ---- Custom domains, attachments ----
  custom_domains: {
    label: 'Domain',
    fields: { name: str(60, { req: true }), slug: str(40), icon: str(30, { def: 'layers' }), color: str(20, { def: 'purple' }), description: text(500), category: str(60), status: en(['active', 'archived'], 'active') },
    search: ['name', 'description'],
  },
  attachments: {
    label: 'Attachment',
    fields: { entity_type: str(40, { req: true }), entity_id: str(40, { req: true }), name: str(200, { req: true }), url: str(2000, { req: true }), note: str(500) },
    search: ['name'],
  },
  // ---- Agent ----
  conversations: { label: 'Conversation', fields: { title: str(200) }, search: ['title'] },
  messages: {
    label: 'Message',
    fields: { conversation_id: ref('conversations', { req: true }), role: en(['user', 'assistant', 'tool', 'system'], 'user'), content: text(40000), tool_calls: json(60000), tool_call_id: str(100), meta: json(60000) },
    search: [],
  },
  agent_actions: {
    label: 'Agent action',
    fields: {
      conversation_id: ref('conversations'), request: text(4000), status: en(['proposed', 'applied', 'failed', 'rejected', 'undone'], 'proposed'),
      steps: json(60000), operations: json(60000), result: json(60000), strong: bool({ def: false }),
    },
    search: ['request'],
  },
};

/** Entities that cannot be written through the generic /api/e/:entity endpoints. */
export const READONLY_VIA_API = new Set(['messages', 'conversations', 'agent_actions']);
export const TIMELINE_ENTITIES = new Set(['goals', 'projects', 'milestones', 'tasks', 'deadlines', 'events', 'habits', 'notes', 'reviews', 'decisions', 'accomplishments', 'experiments', 'focus_sessions', 'exams', 'assignments', 'deliverables', 'workouts']);

export const titleOf = (name, row) => row.title ?? row.name ?? row.content ?? row.exercise ?? row.kind ?? name;
