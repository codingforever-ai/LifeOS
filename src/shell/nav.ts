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
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'primary',
    items: [
      { id: 'today', label: 'Today', path: '/', icon: 'today', mobilePrimary: true },
      { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'tasks', mobilePrimary: true },
      { id: 'calendar', label: 'Calendar', path: '/calendar', icon: 'calendar', mobilePrimary: true },
      { id: 'goals', label: 'Goals', path: '/goals', icon: 'goals' },
      { id: 'projects', label: 'Projects', path: '/projects', icon: 'projects' },
      { id: 'focus', label: 'Focus', path: '/focus', icon: 'focus' },
      { id: 'progress', label: 'Progress', path: '/progress', icon: 'progress' },
    ],
  },
  { id: 'intelligence', label: 'Intelligence', items: [{ id: 'agent', label: 'Agent', path: '/agent', icon: 'agent', mobilePrimary: true }] },
  {
    id: 'utility',
    label: 'Utility',
    items: [
      { id: 'capture', label: 'Capture', path: '/capture', icon: 'capture' },
      { id: 'search', label: 'Search', path: '/search', icon: 'search' },
      { id: 'domains', label: 'Domains', path: '/domains', icon: 'domains' },
      { id: 'settings', label: 'Settings', path: '/settings', icon: 'settings' },
    ],
  },
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
