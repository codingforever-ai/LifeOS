import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { CoreProvider } from './core/store';
import { AuthProvider } from './core/auth';
import { AuthGate } from './core/AuthGate';
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
const Deadlines = lazy(() => import('./features/deadlines/DeadlinesPage'));
const Milestones = lazy(() => import('./features/milestones/MilestonesPage'));
const Habits = lazy(() => import('./features/habits/HabitsPage'));
const Capacity = lazy(() => import('./features/capacity/CapacityPage'));
const Compass = lazy(() => import('./features/compass/CompassPage'));
const Experiments = lazy(() => import('./features/experiments/ExperimentsPage'));
const Patterns = lazy(() => import('./features/patterns/PatternsPage'));
const Review = lazy(() => import('./features/review/ReviewPage'));
const Timeline = lazy(() => import('./features/timeline/TimelinePage'));
const Memory = lazy(() => import('./features/memory/MemoryPage'));
const Accomplishments = lazy(() => import('./features/accomplishments/AccomplishmentsPage'));
const Decisions = lazy(() => import('./features/decisions/DecisionsPage'));
const Map = lazy(() => import('./features/map/MapPage'));
const Create = lazy(() => import('./features/create/CreatePage'));
const Achievements = lazy(() => import('./features/achievements/AchievementsPage'));
const Alerts = lazy(() => import('./features/alerts/AlertsPage'));
const Connect = lazy(() => import('./features/connect/ConnectPage'));
const DomainPage = lazy(() => import('./features/domains/DomainPage'));

function NotFound() {
  return <EmptyState icon="search" title="Page not found" text="That page doesn’t exist in LifeOS." action={<Link to="/"><Button variant="primary">Go to Today</Button></Link>} />;
}

const TITLES: Record<string, string> = { '/': 'Today', '/tasks': 'Tasks', '/calendar': 'Calendar', '/goals': 'Goals', '/projects': 'Projects', '/focus': 'Focus', '/progress': 'Progress', '/agent': 'Agent', '/capture': 'Capture', '/domains': 'Domains', '/search': 'Search', '/settings': 'Settings', '/deadlines': 'Deadlines', '/milestones': 'Milestones', '/habits': 'Habits', '/capacity': 'Capacity', '/compass': 'Compass', '/experiments': 'Experiments', '/patterns': 'Patterns', '/review': 'Review', '/timeline': 'Timeline', '/memory': 'Memory', '/accomplishments': 'Accomplishments', '/decisions': 'Decisions', '/map': 'Map', '/create': 'Create', '/achievements': 'Achievements', '/alerts': 'Alerts', '/connect': 'Connect', '/academic': 'Academic', '/study': 'Study', '/work': 'Work', '/fitness': 'Fitness', '/finance': 'Finance', '/personal': 'Personal' };

export function App() {
  const { pathname } = useLocation();
  useEffect(() => { document.title = `${TITLES[pathname] ?? 'LifeOS'} · LifeOS`; }, [pathname]);
  return (
    <AuthProvider>
      <AuthGate>
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
                  <Route path="deadlines" element={<Deadlines />} />
                  <Route path="milestones" element={<Milestones />} />
                  <Route path="habits" element={<Habits />} />
                  <Route path="capacity" element={<Capacity />} />
                  <Route path="compass" element={<Compass />} />
                  <Route path="experiments" element={<Experiments />} />
                  <Route path="patterns" element={<Patterns />} />
                  <Route path="review" element={<Review />} />
                  <Route path="timeline" element={<Timeline />} />
                  <Route path="memory" element={<Memory />} />
                  <Route path="accomplishments" element={<Accomplishments />} />
                  <Route path="decisions" element={<Decisions />} />
                  <Route path="map" element={<Map />} />
                  <Route path="create" element={<Create />} />
                  <Route path="achievements" element={<Achievements />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route path="connect" element={<Connect />} />
                  <Route path="academic" element={<DomainPage id="academic" />} />
                  <Route path="study" element={<DomainPage id="study" />} />
                  <Route path="work" element={<DomainPage id="work" />} />
                  <Route path="fitness" element={<DomainPage id="fitness" />} />
                  <Route path="finance" element={<DomainPage id="finance" />} />
                  <Route path="personal" element={<DomainPage id="personal" />} />
                  <Route path="domain/:slug" element={<DomainPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </ToastProvider>
        </CoreProvider>
      </AuthGate>
    </AuthProvider>
  );
}
