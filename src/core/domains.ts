import type { DomainDef } from './types';

/**
 * Domain registry. All domains share the Core (tasks, goals, projects, milestones, deadlines, calendar, focus,
 * progress, Agent). Each adds its OWN screens/metrics/terminology under its route. A new domain = one entry here,
 * one overview function in server/domains.mjs and one page in features/domains.
 */
export const DOMAINS: DomainDef[] = [
  { id: 'academic', name: 'Academic', blurb: 'Subjects, exams, assignments', icon: 'graduation', tone: 'lavender', path: '/academic', status: 'core' },
  { id: 'study', name: 'Study', blurb: 'Chapters, practice, revision', icon: 'book', tone: 'plum', path: '/study', status: 'core' },
  { id: 'work', name: 'Work', blurb: 'Clients, deliverables, outcomes', icon: 'briefcase', tone: 'royal', path: '/work', status: 'core' },
  { id: 'fitness', name: 'Fitness', blurb: 'Programs, workouts, recovery', icon: 'dumbbell', tone: 'slate', path: '/fitness', status: 'core' },
  { id: 'finance', name: 'Finance', blurb: 'Commitments, saving, planning', icon: 'wallet', tone: 'sand', path: '/finance', status: 'core' },
  { id: 'personal', name: 'Personal', blurb: 'Errands, home, relationships', icon: 'home', tone: 'purple', path: '/personal', status: 'core' },
];
/** User-defined domains (server table custom_domains). The store keeps this registry in sync with the API. */
let CUSTOM: DomainDef[] = [];
export function setCustomDomains(rows: { slug: string; name: string; description?: string | null; icon?: string | null; color?: string | null }[]) {
  CUSTOM = rows.map((r) => ({ id: r.slug, name: r.name, blurb: r.description || 'Custom domain', icon: r.icon || 'layers', tone: r.color || 'purple', path: `/domain/${r.slug}`, status: 'custom' }));
}
export const allDomains = () => [...DOMAINS, ...CUSTOM];
export const findDomain = (id: string | null | undefined) => allDomains().find((d) => d.id === id);
export const domainName = (id: string | null | undefined) => findDomain(id)?.name ?? (id ? id[0].toUpperCase() + id.slice(1) : 'Unassigned');
export const domainOptions = () => allDomains().map((d) => ({ value: d.id, label: d.name }));
