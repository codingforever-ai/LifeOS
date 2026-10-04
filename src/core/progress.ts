import type { Goal, Project, Task } from './types';

/** Derived progress — the only place progress is computed. Swap inputs for real data later. */
export function projectProgress(p: Project): number {
  if (!p.milestones.length) return 0;
  return p.milestones.filter((m) => m.done).length / p.milestones.length;
}

export function goalProgress(g: Goal, projects: Project[]): number {
  const ps = projects.filter((p) => p.goalId === g.id);
  if (!ps.length) return 0;
  return ps.reduce((s, p) => s + projectProgress(p), 0) / ps.length;
}

export function tasksFor(tasks: Task[], filter: { goalId?: string; projectId?: string }) {
  return tasks.filter((t) => (filter.goalId ? t.goalId === filter.goalId : true) && (filter.projectId ? t.projectId === filter.projectId : true));
}

export const pct = (v: number) => Math.round(v * 100);
