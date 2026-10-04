import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Goal, Project, Task } from './types';
import { demoGoals, demoProjects, demoTasks } from '../data/demo';

/**
 * Single in-memory Core store (Phase 1). The shape — tasks, goals, projects plus a
 * load status — is what a real data layer will provide later; consumers don't change.
 *
 * Preview helper: append ?state=loading | error | empty to /tasks to see those states.
 */
type Status = 'loading' | 'ready' | 'error';

interface CoreValue {
  status: Status;
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  toggleTask: (id: string) => void;
  addTask: (title: string, extra?: Partial<Task>) => void;
  reload: () => void;
}

const Ctx = createContext<CoreValue | null>(null);

export function CoreProvider({ children }: { children: ReactNode }) {
  const forced = new URLSearchParams(window.location.search).get('state');
  const [status, setStatus] = useState<Status>('loading');
  const [tasks, setTasks] = useState<Task[]>(forced === 'empty' ? [] : demoTasks);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus('loading');
    const t = setTimeout(() => setStatus(forced === 'error' && attempt === 0 ? 'error' : 'ready'), 450);
    return () => clearTimeout(t);
  }, [attempt, forced]);

  const toggleTask = useCallback((id: string) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))), []);
  const addTask = useCallback((title: string, extra: Partial<Task> = {}) => {
    setTasks((ts) => [{ id: `t${Date.now()}`, title, domain: 'personal', priority: 'medium', done: false, ...extra }, ...ts]);
  }, []);
  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  const value = useMemo(
    () => ({ status, tasks, goals: demoGoals, projects: demoProjects, toggleTask, addTask, reload }),
    [status, tasks, toggleTask, addTask, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCore must be used inside CoreProvider');
  return v;
}
