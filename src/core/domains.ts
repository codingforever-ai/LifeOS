import type { DomainDef } from './types';

/**
 * Domain registry. A future domain is added by appending one entry here
 * (and later registering its routes/modules) — the shell does not change.
 */
export const DOMAINS: DomainDef[] = [
  { id: 'personal', name: 'Personal', blurb: 'Everyday life and admin', icon: 'user', tone: 'purple', status: 'core' },
  { id: 'work', name: 'Work', blurb: 'Projects, meetings, output', icon: 'briefcase', tone: 'royal', status: 'core' },
  { id: 'academic', name: 'Academic', blurb: 'Courses, assignments, exams', icon: 'graduation', tone: 'lavender', status: 'planned' },
  { id: 'study', name: 'Study', blurb: 'Deep study and revision', icon: 'book', tone: 'plum', status: 'planned' },
  { id: 'wellness', name: 'Wellness', blurb: 'Sleep, mind, recovery', icon: 'leaf', tone: 'mist', status: 'planned' },
  { id: 'nutrition', name: 'Nutrition', blurb: 'Meals and habits of eating', icon: 'apple', tone: 'sand', status: 'planned' },
  { id: 'fitness', name: 'Fitness', blurb: 'Training and movement', icon: 'dumbbell', tone: 'slate', status: 'planned' },
  { id: 'finance', name: 'Finance', blurb: 'Spending, saving, planning', icon: 'wallet', tone: 'graphite', status: 'planned' },
  { id: 'learning', name: 'Learning', blurb: 'Skills and curiosity', icon: 'sparkle', tone: 'purple', status: 'planned' },
  { id: 'home', name: 'Home', blurb: 'Household and upkeep', icon: 'home', tone: 'slate', status: 'planned' },
  { id: 'travel', name: 'Travel', blurb: 'Trips and itineraries', icon: 'plane', tone: 'mist', status: 'planned' },
  { id: 'creativity', name: 'Creativity', blurb: 'Making and ideas', icon: 'palette', tone: 'plum', status: 'planned' },
  { id: 'relationships', name: 'Relationships', blurb: 'People who matter', icon: 'users', tone: 'lavender', status: 'planned' },
  { id: 'business', name: 'Business', blurb: 'Ventures and operations', icon: 'building', tone: 'graphite', status: 'planned' },
  { id: 'research', name: 'Research', blurb: 'Questions and sources', icon: 'flask', tone: 'royal', status: 'planned' },
];

export const domainName = (id: string) => DOMAINS.find((d) => d.id === id)?.name ?? id;
