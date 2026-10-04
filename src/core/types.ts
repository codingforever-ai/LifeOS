/**
 * LifeOS Core model — the ONE shared vocabulary every domain plugs into.
 * Domains (Academic, Wellness, Work, …) tag their records with a `domain` id;
 * they never define their own Task / Goal / Project / Event.
 *
 * Relationship: Goal → Project → Milestone → (Deadline) → Task
 *
 * NOTE: there is deliberately NO stored `progress` field. Progress is derived
 * from milestones / tasks (see core/progress.ts) so it can later come from real data.
 */
export type DomainId = string;

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  domain: DomainId;
  priority: Priority;
  due?: Date;
  estimateMin?: number;
  done: boolean;
  goalId?: string;
  projectId?: string;
}

export interface Milestone {
  id: string;
  title: string;
  due?: Date;
  done: boolean;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  domain: DomainId;
  goalId?: string;
  status: 'active' | 'paused' | 'planning';
  milestones: Milestone[];
}

export interface Goal {
  id: string;
  title: string;
  why: string;
  domain: DomainId;
  horizon: string;
}

export type EventKind = 'event' | 'deadline' | 'focus' | 'task' | 'habit' | 'appointment';

export interface CalendarEntry {
  id: string;
  title: string;
  kind: EventKind;
  domain: DomainId;
  date: Date;
  startHour?: number;
  startMin?: number;
  durationMin?: number;
  place?: string;
}

export interface DomainDef {
  id: DomainId;
  name: string;
  blurb: string;
  icon: string;
  tone: string;
  status: 'core' | 'planned';
}
