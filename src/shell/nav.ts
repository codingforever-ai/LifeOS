import type { IconName } from '../ui/Icon';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: IconName;
  mobilePrimary?: boolean;
}

export interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

/**
 * Sidebar hierarchy (shared by the desktop sidebar and the mobile More sheet).
 * Group order: Today → Plan → Do & Measure → Understand → Remember → Utility.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'today',
    items: [
      { id: 'today', label: 'Today', path: '/', icon: 'today', mobilePrimary: true },
      { id: 'capture', label: 'Capture', path: '/capture', icon: 'inbox' },
      { id: 'calendar', label: 'Calendar', path: '/calendar', icon: 'calendar', mobilePrimary: true },
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    items: [
      { id: 'deadlines', label: 'Deadlines', path: '/deadlines', icon: 'flag' },
      { id: 'goals', label: 'Goals', path: '/goals', icon: 'goals' },
      { id: 'projects', label: 'Projects', path: '/projects', icon: 'projects' },
      { id: 'milestones', label: 'Milestones', path: '/milestones', icon: 'flag' },
      { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'tasks', mobilePrimary: true },
      { id: 'habits', label: 'Habits', path: '/habits', icon: 'repeat' },
    ],
  },
  {
    id: 'measure',
    label: 'Do & Measure',
    items: [
      { id: 'focus', label: 'Focus', path: '/focus', icon: 'focus' },
      { id: 'progress', label: 'Progress', path: '/progress', icon: 'progress' },
      { id: 'capacity', label: 'Capacity', path: '/capacity', icon: 'gauge' },
      { id: 'compass', label: 'Compass', path: '/compass', icon: 'compass' },
    ],
  },
  {
    id: 'understand',
    label: 'Understand',
    items: [
      { id: 'experiments', label: 'Experiments', path: '/experiments', icon: 'flask' },
      { id: 'patterns', label: 'Patterns', path: '/patterns', icon: 'trend' },
      { id: 'review', label: 'Review', path: '/review', icon: 'eye' },
    ],
  },
  {
    id: 'remember',
    label: 'Remember',
    items: [
      { id: 'timeline', label: 'Timeline', path: '/timeline', icon: 'history' },
      { id: 'memory', label: 'Memory', path: '/memory', icon: 'brain' },
      { id: 'decisions', label: 'Decisions', path: '/decisions', icon: 'compass' },
      { id: 'accomplishments', label: 'Accomplishments', path: '/accomplishments', icon: 'trophy' },
      { id: 'map', label: 'Map', path: '/map', icon: 'map' },
    ],
  },
  {
    id: 'utility',
    label: 'Utility',
    items: [
      { id: 'create', label: 'Create', path: '/create', icon: 'plus' },
      { id: 'search', label: 'Search', path: '/search', icon: 'search' },
      { id: 'alerts', label: 'Alerts', path: '/alerts', icon: 'bell' },
      { id: 'connect', label: 'Connect', path: '/connect', icon: 'plug' },
      { id: 'domains', label: 'Domains', path: '/domains', icon: 'domains' },
      { id: 'settings', label: 'Settings', path: '/settings', icon: 'settings' },
    ],
  },
];

/** Reached from the Today dashboard Agent card and the phone tab bar, not the desktop sidebar. */
export const EXTRA_NAV: NavItem[] = [
  { id: 'agent', label: 'Agent', path: '/agent', icon: 'agent', mobilePrimary: true },
];

export const ALL_NAV = [...NAV_GROUPS.flatMap((g) => g.items), ...EXTRA_NAV];
