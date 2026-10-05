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

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'primary',
    items: [
      { id: 'today', label: 'Today', path: '/', icon: 'today', mobilePrimary: true },
      { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'tasks', mobilePrimary: true },
      { id: 'calendar', label: 'Calendar', path: '/calendar', icon: 'calendar', mobilePrimary: true },
      { id: 'deadlines', label: 'Deadlines', path: '/deadlines', icon: 'flag' },
      { id: 'goals', label: 'Goals', path: '/goals', icon: 'goals' },
      { id: 'projects', label: 'Projects', path: '/projects', icon: 'projects' },
      { id: 'milestones', label: 'Milestones', path: '/milestones', icon: 'flag' },
      { id: 'habits', label: 'Habits', path: '/habits', icon: 'repeat' },
      { id: 'focus', label: 'Focus', path: '/focus', icon: 'focus' },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { id: 'agent', label: 'Agent', path: '/agent', icon: 'agent', mobilePrimary: true },
      { id: 'progress', label: 'Progress', path: '/progress', icon: 'progress' },
      { id: 'patterns', label: 'Patterns', path: '/patterns', icon: 'trend' },
      { id: 'review', label: 'Review', path: '/review', icon: 'history' },
      { id: 'experiments', label: 'Experiments', path: '/experiments', icon: 'flask' },
    ],
  },
  {
    id: 'memory',
    label: 'Memory',
    items: [
      { id: 'timeline', label: 'Timeline', path: '/timeline', icon: 'history' },
      { id: 'memory', label: 'Memory', path: '/memory', icon: 'brain' },
      { id: 'decisions', label: 'Decisions', path: '/decisions', icon: 'compass' },
      { id: 'accomplishments', label: 'Accomplishments', path: '/accomplishments', icon: 'trophy' },
    ],
  },
  {
    id: 'utility',
    label: 'Utility',
    items: [
      { id: 'capture', label: 'Capture', path: '/capture', icon: 'capture' },
      { id: 'create', label: 'Create', path: '/create', icon: 'plus' },
      { id: 'search', label: 'Search', path: '/search', icon: 'search' },
      { id: 'alerts', label: 'Alerts', path: '/alerts', icon: 'bell' },
      { id: 'connect', label: 'Connect', path: '/connect', icon: 'plug' },
      { id: 'domains', label: 'Domains', path: '/domains', icon: 'domains' },
      { id: 'settings', label: 'Settings', path: '/settings', icon: 'settings' },
    ],
  },
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
