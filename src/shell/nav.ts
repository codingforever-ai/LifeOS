import type { IconName } from '../ui/Icon';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: IconName;
  /** Shown in the mobile bottom bar (everything else lives under More). */
  mobilePrimary?: boolean;
}

export interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

/**
 * Navigation registry. Adding a module = add an item here + a route in routes.tsx.
 * The shell itself never references a specific domain.
 */
const it = (id: string, label: string, path: string, icon: IconName, mobilePrimary?: boolean): NavItem => ({ id, label, path, icon, mobilePrimary });
export const NAV_GROUPS: NavGroup[] = [
  { id: 'home', items: [it('today', 'Today', '/', 'today', true), it('capture', 'Capture', '/capture', 'inbox'), it('calendar', 'Calendar', '/calendar', 'calendar', true)] },
  { id: 'plan', label: 'Plan', items: [it('deadlines', 'Deadlines', '/deadlines', 'clock'), it('goals', 'Goals', '/goals', 'goals'), it('projects', 'Projects', '/projects', 'projects'), it('milestones', 'Milestones', '/milestones', 'flag'), it('tasks', 'Tasks', '/tasks', 'tasks', true), it('habits', 'Habits', '/habits', 'repeat')] },
  { id: 'do', label: 'Do & measure', items: [it('focus', 'Focus', '/focus', 'focus'), it('progress', 'Progress', '/progress', 'progress'), it('capacity', 'Capacity', '/capacity', 'gauge'), it('compass', 'Compass', '/compass', 'compass')] },
  { id: 'learn', label: 'Understand', items: [it('experiments', 'Experiments', '/experiments', 'flask'), it('patterns', 'Patterns', '/patterns', 'trend'), it('review', 'Review', '/review', 'eye')] },
  { id: 'remember', label: 'Remember', items: [it('timeline', 'Timeline', '/timeline', 'history'), it('memory', 'Memory', '/memory', 'brain'), it('accomplishments', 'Accomplishments', '/accomplishments', 'trophy'), it('decisions', 'Decisions', '/decisions', 'target'), it('map', 'Map', '/map', 'map')] },
  { id: 'operate', label: 'Operate', items: [it('search', 'Search', '/search', 'search'), it('agent', 'Agent', '/agent', 'agent', true), it('create', 'Create', '/create', 'plus')] },
  { id: 'domains', label: 'Domains', items: [it('academic', 'Academic', '/academic', 'graduation'), it('study', 'Study', '/study', 'book'), it('work', 'Work', '/work', 'briefcase'), it('fitness', 'Fitness', '/fitness', 'dumbbell'), it('finance', 'Finance', '/finance', 'wallet'), it('personal', 'Personal', '/personal', 'home'), it('domains', 'All domains', '/domains', 'layers')] },
  { id: 'account', label: 'Account', items: [it('achievements', 'Achievements', '/achievements', 'sparkle'), it('alerts', 'Alerts', '/alerts', 'bell'), it('connect', 'Connect', '/connect', 'plug'), it('settings', 'Settings', '/settings', 'settings')] },
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
