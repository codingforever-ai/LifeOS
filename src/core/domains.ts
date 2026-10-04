import type { DomainDef } from './types';

/**
 * Domain registry. All domains share the Core (tasks, goals, projects, milestones, deadlines, calendar, focus,
 * progress, Agent). Each adds its OWN screens/metrics/terminology under its route. A new domain = one entry here,
 * one overview function in server/domains.mjs and one page in features/domains.
 */
export const DOMAINS: DomainDef[] = [
  { id: 'academic', name: 'Academic', blurb: 'Subjects, exams, assignments', icon: 'graduation', tone: 'lavender', path: '/academic' },
  { id: 'study', name: 'Study', blurb: 'Chapters, practice, revision', icon: 'book', tone: 'plum', path: '/study' },
  { id: 'work', name: 'Work', blurb: 'Clients, deliverables, outcomes', icon: 'briefcase', tone: 'royal', path: '/work' },
  { id: 'fitness', name: 'Fitness', blurb: 'Programs, workouts, recovery', icon: 'dumbbell', tone: 'slate', path: '/fitness' },
  { id: 'finance', name: 'Finance', blurb: 'Commitments, saving, planning', icon: 'wallet', tone: 'sand', path: '/finance' },
  { id: 'personal', name: 'Personal', blurb: 'Errands, home, relationships', icon: 'home', tone: 'purple', path: '/personal' },
];
export const domainName = (id: string | null | undefined) => DOMAINS.find((d) => d.id === id)?.name ?? (id ? id[0].toUpperCase() + id.slice(1) : 'Unassigned');
export const DOMAIN_OPTIONS = DOMAINS.map((d) => ({ value: d.id, label: d.name }));
