/**
 * OPTIONAL development/demo seed. Creates a separate demo account (demo@lifeos.dev / demo-password) with sample data.
 * Never runs automatically and refuses to run when NODE_ENV=production. Production behaviour never depends on it.
 */
import { migrate, db } from './db.mjs';
import { create, complete, saveSettings, uid } from './crud.mjs';
import { hashPassword } from './auth.mjs';
import { addDays, dayKey, zonedToUtc, parseDay } from './tz.mjs';

if (process.env.NODE_ENV === 'production') { console.error('Refusing to seed in production.'); process.exit(1); }
migrate();
const EMAIL = 'demo@lifeos.dev'; const TZ = process.env.SEED_TZ || 'Asia/Kolkata';
db.prepare('DELETE FROM users WHERE email = ?').run(EMAIL);
const u = uid();
db.prepare('INSERT INTO users (id,email,name,password_hash,settings,created_at) VALUES (?,?,?,?,?,?)').run(u, EMAIL, 'Demo', hashPassword('demo-password'), '{}', new Date().toISOString());
saveSettings(u, { timezone: TZ, onboarding: { done: true, step: 8 } });
const today = dayKey(new Date(), TZ);
const at = (offset, h = 12, mi = 0) => zonedToUtc({ ...parseDay(addDays(today, offset)), h, mi }, TZ).toISOString();
const c = (n, b) => create(u, n, b, { allowSystem: true });

const goalFit = c('goals', { title: 'Run a half marathon', why: 'Build lasting health', domain: 'fitness', horizon: 'This year', priority: 2 });
const goalWork = c('goals', { title: 'Launch the design system', why: 'Ship a consistent product', domain: 'work', horizon: 'This quarter', priority: 1 });
const goalStudy = c('goals', { title: 'Ace Physics finals', domain: 'academic', horizon: 'This term', priority: 1 });
const proj = c('projects', { title: 'Design system v1', goal_id: goalWork.id, domain: 'work', status: 'active', due_at: at(10) });
const m1 = c('milestones', { title: 'Foundations & tokens', project_id: proj.id, goal_id: goalWork.id, due_at: at(-2) });
const m2 = c('milestones', { title: 'Component library', project_id: proj.id, goal_id: goalWork.id, due_at: at(5) });
const t = (title, o = {}) => c('tasks', { title, domain: 'work', project_id: proj.id, ...o });
const done1 = t('Audit existing UI', { milestone_id: m1.id, estimate_min: 90, due_at: at(-3), priority: 'high' }); complete(u, 'tasks', done1.id);
const done2 = t('Define colour tokens', { milestone_id: m1.id, estimate_min: 60, due_at: at(-2) }); complete(u, 'tasks', done2.id);
t('Motion guidelines', { milestone_id: m2.id, estimate_min: 120, due_at: at(0, 11, 30), due_has_time: true, priority: 'high' });
t('Button & input components', { milestone_id: m2.id, estimate_min: 180, due_at: at(2), priority: 'medium' });
t('Write usage docs', { milestone_id: m2.id, estimate_min: 90, due_at: at(4) });
c('tasks', { title: 'Revise optics chapter', domain: 'academic', goal_id: goalStudy.id, estimate_min: 90, due_at: at(1), priority: 'high' });
c('tasks', { title: 'Buy running shoes', domain: 'fitness', goal_id: goalFit.id, estimate_min: 45, due_at: at(3) });
c('tasks', { title: 'Renew passport', domain: 'personal', estimate_min: 30 });
c('deadlines', { title: 'Physics exam', due_at: at(4, 10), domain: 'academic', goal_id: goalStudy.id, priority: 'high', importance: 5, consequence: 'Counts for 40% of grade' });
c('deadlines', { title: 'Design review presentation', due_at: at(2, 15), domain: 'work', project_id: proj.id, priority: 'high' });
c('events', { title: 'Team standup', start_at: at(0, 10), end_at: at(0, 10, 30), domain: 'work', recurrence: { freq: 'daily' } });
c('events', { title: 'Design review', start_at: at(0, 14), end_at: at(0, 15), domain: 'work' });
c('events', { title: 'Dentist', start_at: at(1, 17), end_at: at(1, 18), domain: 'personal', kind: 'appointment' });
const h = c('habits', { title: 'Morning run', cadence: 'weekly', target_per_week: 3, domain: 'fitness', goal_id: goalFit.id });
const h2 = c('habits', { title: 'Read 20 pages', cadence: 'daily', domain: 'personal' });
for (const d of [0, 1, 2, 3, 5, 6, 8]) c('habit_completions', { habit_id: h2.id, day: addDays(today, -d), status: 'done' });
for (const d of [0, 2, 4, 8, 10]) c('habit_completions', { habit_id: h.id, day: addDays(today, -d), status: 'done' });
for (let d = 1; d <= 9; d++) { const start = zonedToUtc({ ...parseDay(addDays(today, -d)), h: d % 3 ? 9 : 15, mi: 0 }, TZ); c('focus_sessions', { planned_min: 45, domain: d % 4 ? 'work' : 'academic', goal_id: d % 4 ? goalWork.id : goalStudy.id, started_at: start.toISOString(), ended_at: new Date(start.getTime() + 40 * 60000).toISOString(), accumulated_ms: 40 * 60000, status: 'completed' }); }
c('memories', { content: 'I focus best before 11am.', category: 'preference' });
c('decisions', { title: 'Take the freelance project?', context: 'Offer from a design studio', options: ['Accept', 'Decline'], chosen: 'Decline', reasoning: 'Protect finals prep', expected: 'Better exam focus', review_on: addDays(today, 14) });
const subj = c('subjects', { name: 'Physics', area: 'study' });
const ch = c('chapters', { subject_id: subj.id, title: 'Optics' });
c('topics', { chapter_id: ch.id, subject_id: subj.id, title: 'Refraction', status: 'weak' });
c('topics', { chapter_id: ch.id, subject_id: subj.id, title: 'Lenses', status: 'practiced' });
c('practice_results', { subject_id: subj.id, kind: 'mock', score: 32, total: 50, taken_at: at(-3) });
c('clients', { name: 'Northwind Studio' });
c('programs', { title: 'Half marathon base', goal_id: goalFit.id });
c('finance_items', { kind: 'recurring', title: 'Rent', amount_minor: 2500000, currency: 'INR', due_at: at(6), recurrence: { freq: 'monthly' } });
c('personal_items', { kind: 'errand', title: 'Pick up parcel', due_at: at(1) });
console.log(`Seeded demo account: ${EMAIL} / demo-password (${TZ})`);
