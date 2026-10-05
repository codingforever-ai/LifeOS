/** Progress is DERIVED on the server from tasks/milestones (server/derive.mjs). The client only formats it. */
import type { Goal, Project, Progress } from './types';

export const pct = (v: number | undefined | null) => Math.round((v ?? 0) * 100);

/** Goal progress from server-derived Progress map (0–1). */
export function goalProgress(goal: Goal, _projects: Project[], progress?: Progress): number {
  return progress?.goals?.[goal.id]?.progress ?? 0;
}

/** Project progress from server-derived Progress map (0–1). */
export function projectProgress(project: Project, progress?: Progress): number {
  return progress?.projects?.[project.id]?.progress ?? 0;
}
