/**
 * LifeOS core record shapes as served by the API (ISO strings; timezone handled in lib/tz).
 * There is deliberately NO stored `progress` / `streak` / `consistency` field — those are derived server-side
 * from source records (see server/derive.mjs) and arrive in separate `progress` / `stats` payloads.
 */
export type DomainId = string;
export type Priority = 'high' | 'medium' | 'low';

export interface Base { id: string; created_at: string; updated_at: string; archived_at: string | null }
export interface Goal extends Base { title: string; why: string | null; domain: DomainId; horizon: string | null; status: 'active' | 'paused' | 'completed' | 'abandoned' | 'at_risk'; priority: number; target_date: string | null; notes: string | null }
export interface Project extends Base { title: string; summary: string | null; domain: DomainId; goal_id: string | null; status: 'planning' | 'active' | 'blocked' | 'paused' | 'completed' | 'archived'; due_at: string | null; notes: string | null; blocked_reason: string | null }
export interface Milestone extends Base { title: string; project_id: string | null; goal_id: string | null; deadline_id: string | null; due_at: string | null; done_at: string | null; notes: string | null; position: number }
export interface Task extends Base { title: string; notes: string | null; domain: DomainId; priority: Priority; due_at: string | null; due_has_time: boolean; estimate_min: number | null; actual_min: number | null; done_at: string | null; goal_id: string | null; project_id: string | null; milestone_id: string | null; deadline_id: string | null; parent_id: string | null; tags: string[] | null; recurrence: Recurrence | null }
export interface Deadline extends Base { title: string; due_at: string; has_time: boolean; tz: string | null; priority: Priority; importance: number; consequence: string | null; estimate_min: number | null; status: 'open' | 'done' | 'cancelled'; recurrence: Recurrence | null; reminder_min: number | null; goal_id: string | null; project_id: string | null; milestone_id: string | null; domain: DomainId; notes: string | null; completed_at: string | null }
export interface Recurrence { freq: 'daily' | 'weekly' | 'monthly' | 'yearly'; interval?: number; until?: string; anchor?: number }
export type Rec = Base & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface ProgressInfo { progress: number; tasksTotal?: number; tasksDone?: number; milestonesTotal?: number; milestonesDone?: number; projects?: number; done?: boolean }
export interface Progress { goals: Record<string, ProgressInfo>; projects: Record<string, ProgressInfo>; milestones: Record<string, ProgressInfo> }

export interface CalItem { source: 'event' | 'deadline' | 'task' | 'focus'; id: string; series_id?: string; title: string; kind: string; domain: string; start: string; end: string | null; allDay: boolean; recurring?: boolean; priority?: Priority; place?: string; task_id?: string; project_id?: string; goal_id?: string }

export interface DomainDef { id: DomainId; name: string; blurb: string; icon: string; tone: string; path: string; status?: 'core' | 'planned' }
