import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError } from '../api/client';
import type { Deadline, Goal, Milestone, Progress, Project, Task } from './types';
import { useToast } from '../ui/overlay';

/**
 * Core store: the user's goals/projects/milestones/open tasks/deadlines from the server, plus a global `version`.
 * Every mutation calls `bump()`, which refetches this store AND every useApi() consumer — so completing a task updates
 * Milestone → Project → Goal → Progress → Today → Timeline without any stale state.
 */
type Status = 'loading' | 'ready' | 'error';
interface CoreValue {
  status: Status; error: string | null; version: number;
  tasks: Task[]; goals: Goal[]; projects: Project[]; milestones: Milestone[]; deadlines: Deadline[]; progress: Progress;
  reload: () => void; bump: () => void;
  /** Run a mutation: toasts the outcome, refreshes everything, returns the result (undefined on failure). */
  run: <T>(fn: () => Promise<T>, success?: string) => Promise<T | undefined>;
}
const EMPTY: Progress = { goals: {}, projects: {}, milestones: {} };
const Ctx = createContext<CoreValue | null>(null);

export function CoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [data, setData] = useState<{ tasks: Task[]; goals: Goal[]; projects: Project[]; milestones: Milestone[]; deadlines: Deadline[]; progress: Progress }>({ tasks: [], goals: [], projects: [], milestones: [], deadlines: [], progress: EMPTY });
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    let live = true;
    if (first.current) setStatus('loading');
    api.get<typeof data & { user: unknown }>('/bootstrap')
      .then((d) => { if (!live) return; setData({ tasks: d.tasks, goals: d.goals, projects: d.projects, milestones: d.milestones, deadlines: d.deadlines, progress: d.progress }); setStatus('ready'); setError(null); first.current = false; })
      .catch((e: ApiError) => { if (!live) return; setError(e.message); if (first.current) setStatus('error'); });
    return () => { live = false; };
  }, [version]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const run = useCallback(async <T,>(fn: () => Promise<T>, success?: string) => {
    try { const r = await fn(); if (success) toast(success); bump(); return r; }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.'); return undefined; }
  }, [toast, bump]);

  const value = useMemo<CoreValue>(() => ({ status, error, version, ...data, reload: bump, bump, run }), [status, error, version, data, bump, run]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCore() { const v = useContext(Ctx); if (!v) throw new Error('useCore must be used inside CoreProvider'); return v; }

/** Fetch a server resource; refetches whenever any mutation bumps the global version. */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const { version } = useCore();
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: !!path, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: null }); return; }
    let live = true;
    setState((s) => ({ ...s, loading: s.data === null, error: null }));
    api.get<T>(path).then((d) => live && setState({ data: d, loading: false, error: null })).catch((e: ApiError) => live && setState((s) => ({ data: s.data, loading: false, error: e.message })));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, version, tick, ...deps]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
