import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/auth';
import { CoreProvider } from './core/store';
import { AppShell } from './shell/AppShell';
import { ToastProvider } from './ui/overlay';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { Button, EmptyState, LoadingState } from './ui/primitives';

const Today = lazy(() => import('./features/today/TodayPage'));
const Tasks = lazy(() => import('./features/tasks/TasksPage'));
const Calendar = lazy(() => import('./features/calendar/CalendarPage'));
const Goals = lazy(() => import('./features/goals/GoalsPage'));
const Projects = lazy(() => import('./features/projects/ProjectsPage'));
const Milestones = lazy(() => import('./features/milestones/MilestonesPage'));
const Focus = lazy(() => import('./features/focus/FocusPage'));
const Progress = lazy(() => import('./features/progress/ProgressPage'));
const Capacity = lazy(() => import('./features/capacity/CapacityPage'));
const Compass = lazy(() => import('./features/compass/CompassPage'));
const Agent = lazy(() => import('./features/agent/AgentPage'));
const Capture = lazy(() => import('./features/capture/CapturePage'));
const Domains = lazy(() => import('./features/domains/DomainsPage'));
const Domain = lazy(() => import('./features/domain/DomainPage'));
const Search = lazy(() => import('./features/search/SearchPage'));
const Settings = lazy(() => import('./features/settings/SettingsPage'));
const Login = lazy(() => import('./features/auth/LoginPage'));
const Deadlines = lazy(() => import('./features/deadlines/DeadlinesPage'));
const Habits = lazy(() => import('./features/habits/HabitsPage'));
const Review = lazy(() => import('./features/review/ReviewPage'));
const Timeline = lazy(() => import('./features/timeline/TimelinePage'));
const Memory = lazy(() => import('./features/memory/MemoryPage'));
const Decisions = lazy(() => import('./features/decisions/DecisionsPage'));
const Experiments = lazy(() => import('./features/experiments/ExperimentsPage'));
const Accomplishments = lazy(() => import('./features/accomplishments/AccomplishmentsPage'));
const Alerts = lazy(() => import('./features/alerts/AlertsPage'));
const Connect = lazy(() => import('./features/connect/ConnectPage'));
const Create = lazy(() => import('./features/create/CreatePage'));
const Map = lazy(() => import('./features/map/MapPage'));
const Patterns = lazy(() => import('./features/patterns/PatternsPage'));

function NotFound() {
  return <EmptyState icon="search" title="Page not found" text="That page doesn't exist in LifeOS." action={<Link to="/"><Button variant="primary">Go to Today</Button></Link>} />;
}

const TITLES: Record<string, string> = {
  '/': 'Today', '/tasks': 'Tasks', '/calendar': 'Calendar', '/goals': 'Goals', '/projects': 'Projects',
  '/milestones': 'Milestones', '/habits': 'Habits', '/focus': 'Focus', '/progress': 'Progress',
  '/capacity': 'Capacity', '/compass': 'Compass',
  '/agent': 'Agent', '/capture': 'Capture', '/domains': 'Domains', '/search': 'Search', '/settings': 'Settings',
  '/deadlines': 'Deadlines', '/review': 'Review', '/timeline': 'Timeline', '/memory': 'Memory',
  '/decisions': 'Decisions', '/experiments': 'Experiments', '/accomplishments': 'Accomplishments',
  '/alerts': 'Alerts', '/connect': 'Connect', '/create': 'Create', '/map': 'Map', '/patterns': 'Patterns',
  '/login': 'Sign in',
};

function Gate() {
  const { status } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => { document.title = `${TITLES[pathname] ?? 'LifeOS'} · LifeOS`; }, [pathname]);

  if (status === 'loading') return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}><LoadingState rows={3} /></div>;
  if (status === 'anon') return <Login />;

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
              <Route path="milestones" element={<Milestones />} />
              <Route path="habits" element={<Habits />} />
              <Route path="focus" element={<Focus />} />
              <Route path="progress" element={<Progress />} />
              <Route path="capacity" element={<Capacity />} />
              <Route path="compass" element={<Compass />} />
              <Route path="patterns" element={<Patterns />} />
              <Route path="agent" element={<Agent />} />
              <Route path="capture" element={<Capture />} />
              <Route path="create" element={<Create />} />
              <Route path="domains" element={<Domains />} />
              <Route path="domain/:id" element={<Domain />} />
              <Route path="search" element={<Search />} />
              <Route path="settings" element={<Settings />} />
              <Route path="deadlines" element={<Deadlines />} />
              <Route path="review" element={<Review />} />
              <Route path="timeline" element={<Timeline />} />
              <Route path="memory" element={<Memory />} />
              <Route path="decisions" element={<Decisions />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="accomplishments" element={<Accomplishments />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="connect" element={<Connect />} />
              <Route path="map" element={<Map />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </CoreProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ErrorBoundary>
  );
}
