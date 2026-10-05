import type { IconName } from '../ui/Icon';

export type FieldType = 'domain' | 'text' | 'textarea' | 'select' | 'date' | 'datetime' | 'number' | 'bool' | 'ref' | 'recurrence' | 'tags' | 'url';
export interface FieldDef {
  key: string; label: string; type: FieldType; required?: boolean; options?: { value: string; label: string }[]; ref?: string; placeholder?: string;
  /** For datetime fields: key of a boolean that marks "no specific time" (stored time is local noon). */
  noTimeKey?: string; help?: string; min?: number; max?: number; wide?: boolean;
}
export interface EntityDef {
  entity: string; label: string; plural: string; icon: IconName; tone: string;
  fields: FieldDef[]; title: (r: Record<string, any>) => string; sub?: (r: Record<string, any>) => string; // eslint-disable-line @typescript-eslint/no-explicit-any
  defaults?: Record<string, unknown>;
}
const opt = (...v: string[]) => v.map((x) => ({ value: x, label: x.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) }));
const PRI = opt('high', 'medium', 'low');
const f = (key: string, label: string, type: FieldType, o: Partial<FieldDef> = {}): FieldDef => ({ key, label, type, ...o });
const domain = f('domain', 'Domain', 'domain');
const goalRef = f('goal_id', 'Goal', 'ref', { ref: 'goals' });
const projectRef = f('project_id', 'Project', 'ref', { ref: 'projects' });

export const ENT: Record<string, EntityDef> = {
  tasks: { entity: 'tasks', label: 'Task', plural: 'Tasks', icon: 'tasks', tone: 'purple', title: (r) => r.title, defaults: { priority: 'medium', domain: 'personal' }, fields: [
    f('title', 'Title', 'text', { required: true, placeholder: 'What needs doing?', wide: true }), f('notes', 'Notes', 'textarea', { wide: true }),
    f('due_at', 'Due', 'datetime', { noTimeKey: 'due_has_time' }), f('priority', 'Priority', 'select', { options: PRI }), f('estimate_min', 'Estimate (min)', 'number', { min: 0, max: 6000 }), f('actual_min', 'Actual (min)', 'number', { min: 0, max: 6000 }),
    domain, goalRef, projectRef, f('milestone_id', 'Milestone', 'ref', { ref: 'milestones' }), f('deadline_id', 'Deadline', 'ref', { ref: 'deadlines' }), f('parent_id', 'Parent task', 'ref', { ref: 'tasks' }),
    f('tags', 'Tags', 'tags'), f('recurrence', 'Repeats', 'recurrence'), f('reminder_min', 'Remind before (min)', 'number', { min: 0 }),
  ] },
  deadlines: { entity: 'deadlines', label: 'Deadline', plural: 'Deadlines', icon: 'flag', tone: 'plum', title: (r) => r.title, defaults: { priority: 'medium', importance: 3, has_time: true, domain: 'personal' }, fields: [
    f('title', 'Title', 'text', { required: true, wide: true }), f('due_at', 'Due', 'datetime', { required: true, noTimeKey: 'has_time' }), f('priority', 'Priority', 'select', { options: PRI }), f('importance', 'Importance (1–5)', 'number', { min: 1, max: 5 }),
    f('consequence', 'Consequence if missed', 'text', { wide: true }), f('estimate_min', 'Estimated effort (min)', 'number', { min: 0 }), f('reminder_min', 'Remind before (min)', 'number', { min: 0 }),
    domain, goalRef, projectRef, f('milestone_id', 'Milestone', 'ref', { ref: 'milestones' }), f('recurrence', 'Repeats', 'recurrence'), f('notes', 'Notes', 'textarea', { wide: true }),
  ] },
  goals: { entity: 'goals', label: 'Goal', plural: 'Goals', icon: 'goals', tone: 'royal', title: (r) => r.title, defaults: { status: 'active', priority: 2, domain: 'personal' }, fields: [
    f('title', 'Goal', 'text', { required: true, wide: true }), f('why', 'Why it matters', 'textarea', { wide: true }), domain, f('horizon', 'Horizon', 'text', { placeholder: 'e.g. This quarter' }),
    f('status', 'Status', 'select', { options: opt('active', 'paused', 'completed', 'abandoned', 'at_risk') }), f('priority', 'Priority (1 = top)', 'number', { min: 1, max: 3 }), f('target_date', 'Target date', 'date'), f('notes', 'Notes', 'textarea', { wide: true }),
  ] },
  projects: { entity: 'projects', label: 'Project', plural: 'Projects', icon: 'projects', tone: 'royal', title: (r) => r.title, defaults: { status: 'planning', domain: 'personal' }, fields: [
    f('title', 'Project', 'text', { required: true, wide: true }), f('summary', 'Summary', 'textarea', { wide: true }), domain, goalRef,
    f('status', 'Status', 'select', { options: opt('planning', 'active', 'blocked', 'paused', 'completed', 'archived') }), f('due_at', 'Due', 'datetime'), f('blocked_reason', 'Blocked because', 'text', { wide: true }), f('notes', 'Notes', 'textarea', { wide: true }),
  ] },
  milestones: { entity: 'milestones', label: 'Milestone', plural: 'Milestones', icon: 'flag', tone: 'lavender', title: (r) => r.title, fields: [
    f('title', 'Milestone', 'text', { required: true, wide: true }), projectRef, goalRef, f('deadline_id', 'Deadline', 'ref', { ref: 'deadlines' }), f('due_at', 'Due', 'datetime'), f('notes', 'Notes', 'textarea', { wide: true }),
  ] },
  events: { entity: 'events', label: 'Event', plural: 'Events', icon: 'calendar', tone: 'slate', title: (r) => r.title, defaults: { kind: 'event', domain: 'personal' }, fields: [
    f('title', 'Title', 'text', { required: true, wide: true }), f('start_at', 'Starts', 'datetime', { required: true }), f('end_at', 'Ends', 'datetime'), f('kind', 'Type', 'select', { options: opt('event', 'appointment', 'focus_block', 'time_block') }),
    domain, f('place', 'Place', 'text'), goalRef, projectRef, f('task_id', 'Task', 'ref', { ref: 'tasks' }), f('recurrence', 'Repeats', 'recurrence'), f('notes', 'Notes', 'textarea', { wide: true }),
  ] },
  habits: { entity: 'habits', label: 'Habit', plural: 'Habits', icon: 'repeat', tone: 'mist', title: (r) => r.title, defaults: { cadence: 'daily', target_per_week: 3, domain: 'personal', status: 'active' }, fields: [
    f('title', 'Habit', 'text', { required: true, wide: true }), f('cadence', 'Cadence', 'select', { options: opt('daily', 'weekly', 'custom') }), f('target_per_week', 'Times per week (weekly)', 'number', { min: 1, max: 7 }),
    f('days', 'Custom days (0=Sun … 6=Sat, comma separated)', 'tags', { help: 'Used when cadence is custom, e.g. 1,3,5' }), domain, goalRef, f('status', 'Status', 'select', { options: opt('active', 'paused', 'archived') }), f('reminder_time', 'Reminder (HH:MM)', 'text'), f('notes', 'Notes', 'textarea', { wide: true }),
  ] },
  notes: { entity: 'notes', label: 'Note', plural: 'Notes', icon: 'note', tone: 'graphite', title: (r) => r.title, defaults: { domain: 'personal' }, fields: [f('title', 'Title', 'text', { required: true, wide: true }), f('body', 'Note', 'textarea', { wide: true }), domain, goalRef, projectRef] },
  experiments: { entity: 'experiments', label: 'Experiment', plural: 'Experiments', icon: 'flask', tone: 'plum', title: (r) => r.title, defaults: { duration_days: 14 }, fields: [
    f('title', 'Question', 'text', { required: true, wide: true, placeholder: 'Does morning deep work improve output?' }), f('hypothesis', 'Hypothesis', 'textarea', { wide: true }), f('duration_days', 'Duration (days)', 'number', { min: 1, max: 365 }), f('measures', 'Measures (comma separated)', 'tags'),
  ] },
  decisions: { entity: 'decisions', label: 'Decision', plural: 'Decisions', icon: 'flag', tone: 'sand', title: (r) => r.title, defaults: { domain: 'personal' }, fields: [
    f('title', 'Decision', 'text', { required: true, wide: true }), f('context', 'Context', 'textarea', { wide: true }), f('options', 'Options (comma separated)', 'tags'), f('chosen', 'Chosen option', 'text'), f('reasoning', 'Reasoning', 'textarea', { wide: true }),
    f('expected', 'Expected outcome', 'textarea', { wide: true }), f('review_on', 'Review on', 'date'), domain,
  ] },
  memories: { entity: 'memories', label: 'Memory', plural: 'Memory', icon: 'brain', tone: 'lavender', title: (r) => r.content, defaults: { category: 'fact', source: 'user' }, fields: [
    f('content', 'What should LifeOS remember?', 'textarea', { required: true, wide: true }), f('category', 'Category', 'select', { options: opt('fact', 'preference', 'rule', 'lesson', 'context', 'note') }), f('confidence', 'Confidence (0–100)', 'number', { min: 0, max: 100 }), f('pinned', 'Pinned', 'bool'),
  ] },
  accomplishments: { entity: 'accomplishments', label: 'Accomplishment', plural: 'Accomplishments', icon: 'trophy', tone: 'sand', title: (r) => r.title, defaults: { kind: 'win', domain: 'personal' }, fields: [
    f('title', 'What did you achieve?', 'text', { required: true, wide: true }), f('description', 'Details', 'textarea', { wide: true }), f('achieved_on', 'Date', 'date', { required: true }), f('kind', 'Type', 'select', { options: opt('win', 'certification', 'milestone', 'work', 'personal') }), domain, f('evidence_url', 'Evidence link', 'url', { wide: true }),
  ] },
  inbox: { entity: 'inbox', label: 'Capture', plural: 'Inbox', icon: 'inbox', tone: 'purple', title: (r) => r.content, defaults: { kind: 'thought' }, fields: [f('content', 'Capture', 'textarea', { required: true, wide: true }), f('kind', 'Type', 'select', { options: opt('task', 'thought', 'idea', 'reminder', 'note', 'link', 'image', 'document', 'voice') }), f('url', 'Link', 'url', { wide: true })] },
  measurements: { entity: 'measurements', label: 'Measurement', plural: 'Measurements', icon: 'trend', tone: 'mist', title: (r) => `${r.name}: ${r.value}${r.unit ?? ''}`, fields: [f('name', 'Measure', 'text', { required: true }), f('value', 'Value', 'number', { required: true }), f('unit', 'Unit', 'text'), f('at', 'When', 'datetime', { required: true }), goalRef, domain] },
  // Study / Academic
  subjects: { entity: 'subjects', label: 'Subject', plural: 'Subjects', icon: 'book', tone: 'plum', title: (r) => r.name, fields: [f('name', 'Subject', 'text', { required: true, wide: true }), f('area', 'Area', 'select', { options: opt('study', 'academic') }), f('notes', 'Notes', 'textarea', { wide: true })] },
  chapters: { entity: 'chapters', label: 'Chapter', plural: 'Chapters', icon: 'layers', tone: 'plum', title: (r) => r.title, fields: [f('subject_id', 'Subject', 'ref', { ref: 'subjects', required: true }), f('title', 'Chapter', 'text', { required: true, wide: true }), f('weight', 'Exam weight %', 'number', { min: 0, max: 100 })] },
  topics: { entity: 'topics', label: 'Topic', plural: 'Topics', icon: 'target', tone: 'plum', title: (r) => r.title, defaults: { status: 'new' }, fields: [f('chapter_id', 'Chapter', 'ref', { ref: 'chapters', required: true }), f('title', 'Topic', 'text', { required: true, wide: true }), f('status', 'Status', 'select', { options: opt('new', 'studying', 'practiced', 'weak', 'revised') }), f('confidence', 'Confidence (0–5)', 'number', { min: 0, max: 5 }), f('next_revision', 'Next revision', 'date'), f('bookmarked', 'Bookmarked', 'bool')] },
  exams: { entity: 'exams', label: 'Exam', plural: 'Exams', icon: 'graduation', tone: 'lavender', title: (r) => r.title, fields: [f('title', 'Exam', 'text', { required: true, wide: true }), f('subject_id', 'Subject', 'ref', { ref: 'subjects' }), f('exam_at', 'Date & time', 'datetime', { required: true }), f('syllabus', 'Syllabus', 'textarea', { wide: true }), f('result', 'Result', 'text')] },
  assignments: { entity: 'assignments', label: 'Assignment', plural: 'Assignments', icon: 'doc', tone: 'lavender', title: (r) => r.title, defaults: { status: 'todo' }, fields: [f('title', 'Assignment', 'text', { required: true, wide: true }), f('subject_id', 'Subject', 'ref', { ref: 'subjects' }), f('due_at', 'Due', 'datetime', { required: true }), f('status', 'Status', 'select', { options: opt('todo', 'in_progress', 'submitted', 'graded') }), f('grade', 'Grade', 'text'), f('notes', 'Notes', 'textarea', { wide: true })] },
  practice_results: { entity: 'practice_results', label: 'Test result', plural: 'Test results', icon: 'trend', tone: 'plum', title: (r) => `${r.kind}: ${r.score}/${r.total}`, defaults: { kind: 'practice' }, fields: [f('subject_id', 'Subject', 'ref', { ref: 'subjects' }), f('topic_id', 'Topic', 'ref', { ref: 'topics' }), f('kind', 'Type', 'select', { options: opt('practice', 'mock', 'paper') }), f('score', 'Score', 'number', { required: true }), f('total', 'Out of', 'number', { required: true }), f('taken_at', 'Taken', 'datetime', { required: true }), f('duration_min', 'Duration (min)', 'number'), f('notes', 'Notes', 'textarea', { wide: true })] },
  study_resources: { entity: 'study_resources', label: 'Resource', plural: 'Resources', icon: 'note', tone: 'plum', title: (r) => r.title, defaults: { kind: 'note' }, fields: [f('title', 'Title', 'text', { required: true, wide: true }), f('kind', 'Type', 'select', { options: opt('note', 'formula', 'question', 'paper', 'bookmark') }), f('subject_id', 'Subject', 'ref', { ref: 'subjects' }), f('topic_id', 'Topic', 'ref', { ref: 'topics' }), f('body', 'Content', 'textarea', { wide: true }), f('url', 'Link', 'url', { wide: true }), f('bookmarked', 'Bookmarked', 'bool')] },
  // Work
  clients: { entity: 'clients', label: 'Client', plural: 'Clients', icon: 'building', tone: 'royal', title: (r) => r.name, fields: [f('name', 'Client', 'text', { required: true, wide: true }), f('status', 'Status', 'select', { options: opt('active', 'paused', 'closed') }), f('notes', 'Notes', 'textarea', { wide: true })] },
  deliverables: { entity: 'deliverables', label: 'Deliverable', plural: 'Deliverables', icon: 'flag', tone: 'royal', title: (r) => r.title, defaults: { status: 'todo' }, fields: [f('title', 'Deliverable', 'text', { required: true, wide: true }), f('client_id', 'Client', 'ref', { ref: 'clients' }), projectRef, f('due_at', 'Due', 'datetime'), f('status', 'Status', 'select', { options: opt('todo', 'in_progress', 'review', 'delivered') }), f('outcome', 'Outcome', 'textarea', { wide: true })] },
  // Fitness
  programs: { entity: 'programs', label: 'Program', plural: 'Programs', icon: 'dumbbell', tone: 'slate', title: (r) => r.title, defaults: { status: 'active' }, fields: [f('title', 'Program', 'text', { required: true, wide: true }), goalRef, f('status', 'Status', 'select', { options: opt('active', 'paused', 'completed') }), f('notes', 'Notes', 'textarea', { wide: true })] },
  workouts: { entity: 'workouts', label: 'Workout', plural: 'Workouts', icon: 'dumbbell', tone: 'slate', title: (r) => r.title, fields: [f('title', 'Workout', 'text', { required: true, wide: true }), f('program_id', 'Program', 'ref', { ref: 'programs' }), f('performed_at', 'When', 'datetime', { required: true }), f('duration_min', 'Duration (min)', 'number'), f('recovery', 'Recovery (1–5)', 'number', { min: 1, max: 5 }), f('notes', 'Notes', 'textarea', { wide: true })] },
  exercise_sets: { entity: 'exercise_sets', label: 'Set', plural: 'Sets', icon: 'dumbbell', tone: 'slate', title: (r) => `${r.exercise} ${r.reps ?? ''}×${r.weight ?? ''}`, fields: [f('workout_id', 'Workout', 'ref', { ref: 'workouts', required: true }), f('exercise', 'Exercise', 'text', { required: true }), f('reps', 'Reps', 'number'), f('weight', 'Weight', 'number'), f('rpe', 'RPE (1–10)', 'number', { min: 1, max: 10 })] },
  // Finance / Personal
  finance_items: { entity: 'finance_items', label: 'Finance item', plural: 'Finance', icon: 'wallet', tone: 'sand', title: (r) => r.title, defaults: { kind: 'commitment', currency: 'INR', status: 'open' }, fields: [f('title', 'Title', 'text', { required: true, wide: true }), f('kind', 'Type', 'select', { options: opt('goal', 'saving', 'spending', 'commitment', 'recurring', 'plan') }), f('amount_minor', 'Amount (in smallest unit, e.g. paise)', 'number', { min: 0 }), f('currency', 'Currency', 'text'), f('due_at', 'Due', 'datetime'), f('recurrence', 'Repeats', 'recurrence'), f('status', 'Status', 'select', { options: opt('open', 'done') }), f('notes', 'Notes', 'textarea', { wide: true })] },
  personal_items: { entity: 'personal_items', label: 'Item', plural: 'Personal', icon: 'home', tone: 'purple', title: (r) => r.title, defaults: { kind: 'errand', status: 'open' }, fields: [f('title', 'Title', 'text', { required: true, wide: true }), f('kind', 'Type', 'select', { options: opt('errand', 'appointment', 'household', 'relationship', 'travel', 'admin') }), f('due_at', 'Due', 'datetime'), f('status', 'Status', 'select', { options: opt('open', 'done') }), f('notes', 'Notes', 'textarea', { wide: true })] },
};
export const entityDef = (name: string) => ENT[name];

/* ---- Extended model (shared by every module): task types/statuses, goal measurement, deadline types, custom domains ---- */
export const TASK_TYPES = opt('standard', 'deep_work', 'quick', 'admin', 'study', 'practice', 'revision', 'assignment', 'exam_prep', 'work_deliverable', 'meeting_prep', 'communication', 'call', 'email', 'errand', 'chore', 'purchase', 'payment', 'workout', 'recovery', 'personal', 'creative', 'research', 'review', 'planning', 'habit_task', 'follow_up', 'recurring', 'milestone_task');
export const TASK_STATUSES = opt('inbox', 'planned', 'in_progress', 'blocked', 'waiting', 'completed', 'cancelled', 'deferred');
export const GOAL_TYPES = opt('outcome', 'performance', 'process', 'learning', 'academic', 'career', 'financial', 'fitness', 'health', 'habit', 'relationship', 'personal', 'creative', 'project', 'experience', 'lifestyle', 'skill', 'business', 'savings', 'revenue', 'debt', 'exam', 'grade', 'reading', 'time', 'frequency', 'quantity', 'completion', 'custom');
export const MEASURE_TYPES = opt('milestones', 'binary', 'count', 'percentage', 'currency', 'duration', 'distance', 'weight', 'score', 'rating', 'frequency', 'streak', 'quantity', 'ratio', 'numeric');
const ENERGY = opt('low', 'medium', 'high');
const addFields = (e: string, ...fs: FieldDef[]) => { ENT[e].fields.push(...fs); };
const before = (e: string, key: string, ...fs: FieldDef[]) => { const i = ENT[e].fields.findIndex((x) => x.key === key); ENT[e].fields.splice(i < 0 ? ENT[e].fields.length : i, 0, ...fs); };

before('tasks', 'due_at', f('task_type', 'Task type', 'select', { options: TASK_TYPES }), f('status', 'Status', 'select', { options: TASK_STATUSES }), f('start_at', 'Start', 'datetime'));
addFields('tasks', f('importance', 'Importance (1–5)', 'number', { min: 1, max: 5 }), f('urgency', 'Urgency (1–5)', 'number', { min: 1, max: 5 }), f('energy', 'Energy needed', 'select', { options: ENERGY }), f('context', 'Context', 'text', { placeholder: '@home, @computer…' }), f('location', 'Location', 'text'), f('blocker', 'Blocked by', 'text', { wide: true }));
ENT.tasks.defaults = { ...ENT.tasks.defaults, status: 'planned', task_type: 'standard', energy: 'medium' };
before('goals', 'status', f('goal_type', 'Goal type', 'select', { options: GOAL_TYPES }), f('measure_type', 'Measured as', 'select', { options: MEASURE_TYPES, help: 'Pick “milestones” to derive progress from linked projects, milestones and tasks.' }),
  f('direction', 'Direction', 'select', { options: opt('increase', 'decrease', 'maintain', 'achieve') }), f('method', 'Progress comes from', 'select', { options: [{ value: 'work', label: 'Linked projects / milestones / tasks' }, { value: 'measurements', label: 'Logged measurements' }, { value: 'habits', label: 'Linked habit entries' }, { value: 'focus', label: 'Tracked focus time' }], help: 'Progress is always computed from this source — it is never typed in.' }),
  f('baseline', 'Baseline (start value)', 'number'), f('target_value', 'Target value', 'number'), f('unit', 'Unit', 'text', { placeholder: '₹, kg, km, hours, pages…' }), f('start_date', 'Start date', 'date'));
addFields('goals', f('confidence', 'Confidence (0–100)', 'number', { min: 0, max: 100 }), f('parent_id', 'Part of vision/goal', 'ref', { ref: 'goals' }));
ENT.goals.defaults = { ...ENT.goals.defaults, goal_type: 'outcome', measure_type: 'milestones', direction: 'increase', method: 'work' };
before('deadlines', 'priority', f('type', 'Type', 'select', { options: opt('exam', 'assignment', 'project', 'deliverable', 'bill', 'payment', 'appointment', 'application', 'renewal', 'travel', 'event', 'commitment', 'milestone', 'challenge', 'order', 'repair', 'medical', 'responsibility', 'other') }));
addFields('deadlines', f('status', 'Status', 'select', { options: opt('open', 'done', 'cancelled') }), f('outcome', 'Outcome', 'textarea', { wide: true }), f('blocker', 'Blocked by', 'text', { wide: true }), f('depends_on_id', 'Depends on deadline', 'ref', { ref: 'deadlines' }));
ENT.deadlines.defaults = { ...ENT.deadlines.defaults, type: 'commitment', status: 'open' };
addFields('projects', f('priority', 'Priority', 'select', { options: PRI }), f('start_date', 'Start date', 'date'), f('depends_on_id', 'Depends on project', 'ref', { ref: 'projects' }), f('outcome', 'Outcome', 'textarea', { wide: true }));
addFields('milestones', domain, f('target_text', 'Measurable target', 'text', { wide: true, placeholder: 'e.g. Score 80% on mock test' }), f('outcome', 'Outcome', 'textarea', { wide: true }));
addFields('habits', f('kind', 'Tracked as', 'select', { options: opt('binary', 'quantity', 'duration') }), f('target_value', 'Daily target', 'number'), f('unit', 'Unit', 'text', { placeholder: 'pages, glasses, minutes' }), f('counts_to_goal', 'Counts toward linked goal', 'bool', { help: 'Only when the goal’s progress source is “Linked habit entries”.' }));
addFields('accomplishments', f('evidence', 'Evidence', 'textarea', { wide: true }), goalRef, projectRef, f('before_value', 'Before', 'text'), f('after_value', 'After', 'text'), f('outcome', 'Outcome', 'textarea', { wide: true }));
addFields('decisions', f('assumptions', 'Assumptions', 'textarea', { wide: true }), f('actual', 'Actual outcome', 'textarea', { wide: true }), f('learned', 'Lesson learned', 'textarea', { wide: true }), f('status', 'Status', 'select', { options: opt('open', 'reviewed') }));
ENT.memories.fields = ENT.memories.fields.map((x) => (x.key === 'category' ? { ...x, options: opt('fact', 'preference', 'principle', 'rule', 'lesson', 'decision', 'event', 'relationship', 'context', 'insight', 'note') } : x));
ENT.inbox.fields = ENT.inbox.fields.map((x) => (x.key === 'kind' ? { ...x, options: opt('thought', 'task', 'idea', 'note', 'deadline', 'event', 'goal', 'project', 'decision', 'reflection', 'memory', 'resource', 'link', 'commitment') } : x));
before('inbox', 'content', f('title', 'Title', 'text', { wide: true }));
addFields('inbox', f('tags', 'Tags (comma separated)', 'tags'), domain, f('due_at', 'Date / time', 'datetime'));
ENT.custom_domains = { entity: 'custom_domains', label: 'Domain', plural: 'Domains', icon: 'layers', tone: 'purple', title: (r) => r.name, defaults: { color: 'purple', icon: 'layers', status: 'active' }, fields: [
  f('name', 'Name', 'text', { required: true, wide: true, placeholder: 'Music, Travel, Business…' }), f('description', 'Description', 'textarea', { wide: true }), f('category', 'Category', 'text'),
  f('icon', 'Icon', 'select', { options: opt('layers', 'briefcase', 'book', 'leaf', 'plane', 'users', 'home', 'flask', 'trophy', 'sparkle', 'wallet', 'dumbbell', 'brain', 'palette', 'building', 'target') }),
  f('color', 'Accent', 'select', { options: opt('purple', 'royal', 'lavender', 'plum', 'slate', 'mist', 'sand') }), f('status', 'Status', 'select', { options: opt('active', 'archived') }),
] };

ENT.experiment_observations = { entity: 'experiment_observations', label: 'Observation', plural: 'Observations', icon: 'flask', tone: 'plum', title: (r) => `${r.measure ?? 'value'}: ${r.value ?? ''} ${r.note ?? ''}`, fields: [
  f('experiment_id', 'Experiment', 'ref', { ref: 'experiments', required: true }), f('day', 'Day', 'date', { required: true }), f('measure', 'Measure', 'text', { placeholder: 'e.g. hours slept' }), f('value', 'Value', 'number'), f('note', 'Note', 'textarea', { wide: true }),
] };
