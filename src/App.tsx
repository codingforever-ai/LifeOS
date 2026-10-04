import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { CoreProvider } from './core/store';
import { AppShell } from './shell/AppShell';
import { ToastProvider } from './ui/overlay';
import { Button, EmptyState, LoadingState } from './ui/primitives';

/** Route registry. A new module = one lazy import + one <Route>, plus a nav entry in shell/nav.ts. */
const Today = lazy(() => import('./features/today/TodayPage'));
const Tasks = lazy(() => import('./features/tasks/TasksPage'));
const Calendar = lazy(() => import('./features/calendar/CalendarPage'));
const Goals = lazy(() => import('./features/goals/GoalsPage'));
const Projects = lazy(() => import('./features/projects/ProjectsPage'));
const Focus = lazy(() => import('./features/focus/FocusPage'));
const Progress = lazy(() => import('./features/progress/ProgressPage'));
const Agent = lazy(() => import('./features/agent/AgentPage'));
const Capture = lazy(() => import('./features/capture/CapturePage'));
const Domains = lazy(() => import('./features/domains/DomainsPage'));
const Search = lazy(() => import('./features/search/SearchPage'));
const Settings = lazy(() => import('./features/settings/SettingsPage'));

function NotFound() {
  return <EmptyState icon="search" title="Page not found" text="That page doesn’t exist in LifeOS." action={<Link to="/"><Button variant="primary">Go to Today</Button></Link>} />;
}

const TITLES: Record<string, string> = { '/': 'Today', '/tasks': 'Tasks', '/calendar': 'Calendar', '/goals': 'Goals', '/projects': 'Projects', '/focus': 'Focus', '/progress': 'Progress', '/agent': 'Agent', '/capture': 'Capture', '/domains': 'Domains', '/search': 'Search', '/settings': 'Settings' };

export function App() {
  const { pathname } = useLocation();
  useEffect(() => { document.title = `${TITLES[pathname] ?? 'LifeOS'} · LifeOS`; }, [pathname]);
  return (
    <CoreProvider>
      <ToastProvider>
        <Suspense fallback={<div style={{ padding: 32 }}><LoadingState rows={3} /></div>}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Today />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="goals" element={<Goals />} />
              <Route path="projects" element={<Projects />} />
              <Route path="focus" element={<Focus />} />
              <Route path="progress" element={<Progress />} />
              <Route path="agent" element={<Agent />} />
              <Route path="capture" element={<Capture />} />
              <Route path="domains" element={<Domains />} />
              <Route path="search" element={<Search />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </CoreProvider>
  );
}
