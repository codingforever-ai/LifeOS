/**
 * DEMO DATA — Phase 1 only. Everything in this file is replaceable by real
 * data sources; nothing else in the app should hard-code content like this.
 * Dates are relative to "today" so the demo always feels current.
 */
import { addDays, startOfDay } from '../lib/date';
import type { CalendarEntry, Goal, Project, Task } from '../core/types';

const today = startOfDay(new Date());
const d = (n: number) => addDays(today, n);

export const DEMO_USER = { name: 'Vilas' };

export const demoGoals: Goal[] = [
  { id: 'g1', title: 'Launch the LifeOS beta', why: 'A calm system I actually use every day.', domain: 'work', horizon: 'By end of quarter' },
  { id: 'g2', title: 'Run a half marathon', why: 'Build a steady, sustainable base.', domain: 'fitness', horizon: 'In 4 months' },
  { id: 'g3', title: 'Read twelve books this year', why: 'Make slow, deep reading a habit.', domain: 'learning', horizon: 'This year' },
];

export const demoProjects: Project[] = [
  {
    id: 'p1', title: 'Design system', summary: 'Tokens, components and motion for every LifeOS surface.', domain: 'work', goalId: 'g1', status: 'active',
    milestones: [
      { id: 'm1', title: 'Colour & type tokens', done: true, due: d(-12) },
      { id: 'm2', title: 'Core components', done: true, due: d(-4) },
      { id: 'm3', title: 'Motion guidelines', done: false, due: d(5) },
      { id: 'm4', title: 'Accessibility audit', done: false, due: d(12) },
    ],
  },
  {
    id: 'p2', title: 'Agent experience', summary: 'Conversation, tools and confirmation flows.', domain: 'work', goalId: 'g1', status: 'planning',
    milestones: [
      { id: 'm5', title: 'Tool contract', done: true, due: d(-2) },
      { id: 'm6', title: 'Confirmation surfaces', done: false, due: d(9) },
      { id: 'm7', title: 'Result reporting', done: false, due: d(18) },
    ],
  },
  {
    id: 'p3', title: 'Training plan', summary: 'Twelve-week build towards race day.', domain: 'fitness', goalId: 'g2', status: 'active',
    milestones: [
      { id: 'm8', title: 'Base weeks 1–4', done: true, due: d(-14) },
      { id: 'm9', title: 'Build weeks 5–8', done: false, due: d(14) },
      { id: 'm10', title: 'Taper & race', done: false, due: d(60) },
    ],
  },
  {
    id: 'p4', title: 'Reading list', summary: 'Pick, schedule and finish one book a month.', domain: 'learning', goalId: 'g3', status: 'paused',
    milestones: [
      { id: 'm11', title: 'Books 1–4', done: true, due: d(-30) },
      { id: 'm12', title: 'Books 5–8', done: false, due: d(40) },
    ],
  },
];

export const demoTasks: Task[] = [
  { id: 't1', title: 'Write motion guidelines', notes: 'Cover easing, durations and reduced-motion rules.', domain: 'work', priority: 'high', due: d(0), estimateMin: 90, done: false, goalId: 'g1', projectId: 'p1' },
  { id: 't2', title: 'Review confirmation flow with the team', domain: 'work', priority: 'high', due: d(0), estimateMin: 30, done: false, goalId: 'g1', projectId: 'p2' },
  { id: 't3', title: 'Easy 6 km run', domain: 'fitness', priority: 'medium', due: d(0), estimateMin: 45, done: false, goalId: 'g2', projectId: 'p3' },
  { id: 't4', title: 'Reply to landlord about renewal', domain: 'personal', priority: 'medium', due: d(1), estimateMin: 10, done: false },
  { id: 't5', title: 'Accessibility pass on navigation', notes: 'Keyboard order, focus rings, contrast.', domain: 'work', priority: 'medium', due: d(3), estimateMin: 60, done: false, goalId: 'g1', projectId: 'p1' },
  { id: 't6', title: 'Plan next week’s long run route', domain: 'fitness', priority: 'low', due: d(4), estimateMin: 20, done: false, goalId: 'g2', projectId: 'p3' },
  { id: 't7', title: 'Finish chapter 6', domain: 'learning', priority: 'low', due: d(2), estimateMin: 40, done: false, goalId: 'g3', projectId: 'p4' },
  { id: 't8', title: 'Renew passport appointment', domain: 'personal', priority: 'high', due: d(-1), estimateMin: 15, done: false },
  { id: 't9', title: 'Update project brief', domain: 'work', priority: 'low', due: d(-2), estimateMin: 25, done: true, goalId: 'g1', projectId: 'p1' },
  { id: 't10', title: 'Book dentist', domain: 'personal', priority: 'low', estimateMin: 5, done: false },
];

export const demoCalendar: CalendarEntry[] = [
  { id: 'e1', title: 'Deep work — motion guidelines', kind: 'focus', domain: 'work', date: d(0), startHour: 9, startMin: 30, durationMin: 90 },
  { id: 'e2', title: 'Design sync', kind: 'event', domain: 'work', date: d(0), startHour: 11, startMin: 30, durationMin: 45, place: 'Video call' },
  { id: 'e3', title: 'Lunch with Maya', kind: 'appointment', domain: 'relationships', date: d(0), startHour: 13, durationMin: 60, place: 'Café Lumen' },
  { id: 'e4', title: 'Easy run', kind: 'habit', domain: 'fitness', date: d(0), startHour: 18, durationMin: 45 },
  { id: 'e5', title: 'Landlord reply due', kind: 'deadline', domain: 'personal', date: d(1) },
  { id: 'e6', title: 'Planning review', kind: 'event', domain: 'work', date: d(1), startHour: 10, durationMin: 60 },
  { id: 'e7', title: 'Motion guidelines due', kind: 'deadline', domain: 'work', date: d(5) },
  { id: 'e8', title: 'Flight to Lisbon', kind: 'appointment', domain: 'travel', date: d(8), startHour: 7, startMin: 45, durationMin: 180, place: 'Terminal 2' },
  { id: 'e9', title: 'Training: build week begins', kind: 'event', domain: 'fitness', date: d(14) },
  { id: 'e10', title: 'Accessibility audit due', kind: 'deadline', domain: 'work', date: d(12) },
  { id: 'e11', title: 'Reading block', kind: 'focus', domain: 'learning', date: d(2), startHour: 20, durationMin: 45 },
  { id: 'e12', title: 'Passport appointment', kind: 'appointment', domain: 'personal', date: d(6), startHour: 15, durationMin: 30, place: 'City office' },
  { id: 'e13', title: 'Quarterly review', kind: 'event', domain: 'work', date: d(-3), startHour: 14, durationMin: 60 },
];

/** Last 7 days (oldest first) — planned vs completed task count, focus minutes. */
export const demoWeek = {
  labels: Array.from({ length: 7 }, (_, i) => addDays(today, i - 6).toLocaleDateString(undefined, { weekday: 'short' })),
  planned: [6, 5, 7, 4, 6, 3, 5],
  completed: [5, 5, 5, 4, 6, 2, 3],
  focusMin: [140, 95, 180, 120, 160, 40, 75],
};

/** Last 28 days — 1 if the day had meaningful activity. */
export const demoConsistency: number[] = [1,1,0,1,1,1,0, 1,1,1,0,1,1,0, 1,1,1,1,0,1,1, 1,0,1,1,1,1,0];

export const demoFocusHistory = [
  { id: 'f1', label: 'Write motion guidelines', minutes: 50, when: 'Yesterday, 9:40' },
  { id: 'f2', label: 'Reading block', minutes: 25, when: 'Yesterday, 20:05' },
  { id: 'f3', label: 'Accessibility pass', minutes: 45, when: '2 days ago' },
];

export const demoRecentSearches = ['motion guidelines', 'passport', 'training plan', 'Maya'];
