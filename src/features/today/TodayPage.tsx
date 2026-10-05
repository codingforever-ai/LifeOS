import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { api } from '../../api/client';
import type { Task, CalItem } from '../../core/types';
import { fmt, minutesLabel, countdown, dayKey } from '../../lib/tz';
import { Alert, BubbleIcon, Button, Checkbox, LoadingState, ErrorState, ProgressBar, Section, Surface } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { TaskDetail, TaskRow } from '../tasks/TaskParts';

interface TodayHabit {
  id: string; title: string; domain: string; cadence: string; status: string;
  stats: { doneToday: boolean; streak: number; consistency: number; last7: { day: string; status: string }[]; total: number; longest: number };
}
interface TodayDeadline {
  id: string; title: string; due_at: string; has_time: boolean; priority: string; importance: number;
}
interface TodayGoal {
  id: string; title: string; domain: string; horizon: string | null; status: string; priority: number;
  progress: number; health: { state: string; reasons: string[] };
}
interface TodayAlert {
  id: string; title: string; body: string | null; priority: string;
}

interface TodayData {
  day: string; tz: string; state: string; why: string[];
  schedule: CalItem[];
  important: Task[];
  overdueCount: number;
  deadlines: TodayDeadline[];
  goals: TodayGoal[];
  capacity: { day: string; available: number; committed: number; planned: number; remaining: number; overload: boolean; tasks: number };
  habits: TodayHabit[];
  running: { id: string; planned_min: number; started_at: string; status: string } | null;
  inbox: number;
  alerts: TodayAlert[];
}

const stateMsg: Record<string, string> = {
  normal: 'A balanced day with room for what matters.',
  overloaded: 'Today is full. Consider moving something.',
  behind: 'You have overdue work. Let\u2019s catch up.',
  deadline_approaching: 'Deadlines are approaching.',
  focus_opportunity: 'Plenty of open time for deep work.',
  underplanned: 'Plenty of room today.',
  no_commitments: 'Nothing scheduled today. A good day to plan ahead.',
};

const goalHealthTone: Record<string, 'ok' | 'warn' | 'accent' | undefined> = {
  healthy: 'ok', watch: 'accent', at_risk: 'warn', stalled: 'warn',
  active: undefined, paused: undefined, completed: 'ok', abandoned: undefined,
};

export default function TodayPage() {
  const { user, tz } = useAuth();
  const { run } = useCore();
  const nav = useNavigate();
  const [open, setOpen] = useState<Task | null>(null);
  const [capture, setCapture] = useState('');
  const { data, loading, error, reload } = useApi<TodayData>('/today');

  const today = dayKey(new Date(), tz);

  const saveCapture = () => {
    const v = capture.trim();
    if (!v) return;
    run(() => api.post('/e/inbox', { kind: 'task', content: v }), 'Captured');
    setCapture('');
  };

  const toggleHabit = (h: TodayHabit) => {
    if (h.stats.doneToday) run(() => api.del(`/habits/${h.id}/log/${today}`), 'Removed');
    else run(() => api.post(`/habits/${h.id}/log`, { day: today }), 'Habit logged');
  };

  if (loading) return <div style={{ padding: 24 }}><LoadingState label="Loading today" /></div>;
  if (error) return <ErrorState text={error} onRetry={reload} />;
  if (!data) return null;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todays = data.schedule.filter((e) => e.start);
  const nowMin = hour * 60 + now.getMinutes();
  const current = todays.find((e) => {
    const s = new Date(e.start).getHours() * 60 + new Date(e.start).getMinutes();
    const dur = e.end ? (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000 : 60;
    return s <= nowMin && nowMin < s + dur;
  });
  const next = todays.find((e) => new Date(e.start).getHours() * 60 + new Date(e.start).getMinutes() > nowMin);
  const focusEntry = current ?? next ?? todays[0];

  const cap = data.capacity;
  const load = cap.available > 0 ? Math.min(1, (cap.committed + cap.planned) / cap.available) : 0;
  const habitsDone = data.habits.filter((h) => h.stats.doneToday).length;
  const nothingToday = todays.length === 0 && data.overdueCount === 0 && data.habits.length === 0;

  return (
    <>
      <header className="today-hero">
        <div className="caption">{fmt.dateLong(now.toISOString(), tz)}</div>
        <h1>{greeting}, {user?.name}.</h1>
        <p className="muted lead">{stateMsg[data.state] ?? stateMsg.normal}</p>
        {data.why.length > 0 && (
          <div className="today-banner"><Alert tone="accent" icon="info">{data.why.join(' ')}</Alert></div>
        )}
        {data.why.length === 0 && nothingToday && (
          <div className="today-banner"><Alert tone="accent" icon="info">Nothing is scheduled or due today.</Alert></div>
        )}
      </header>

      {/* Quick capture */}
      <div className="today-capture">
        <input
          className="input"
          type="text"
          placeholder="Capture something — press Enter to save"
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveCapture(); }}
          aria-label="Quick capture"
        />
        <Button variant="primary" icon="plus" onClick={saveCapture} disabled={!capture.trim()}>Capture</Button>
      </div>

      {/* Quick actions */}
      <div className="today-actions">
        <button type="button" className="qa-btn" onClick={() => nav('/focus')}><Icon name="focus" /><span>Focus</span></button>
        <button type="button" className="qa-btn" onClick={() => nav('/create')}><Icon name="plus" /><span>Create</span></button>
        <button type="button" className="qa-btn" onClick={() => nav('/calendar')}><Icon name="calendar" /><span>Calendar</span></button>
        <button type="button" className="qa-btn" onClick={() => nav('/capture')}><Icon name="inbox" /><span>Inbox{data.inbox > 0 ? ` (${data.inbox})` : ''}</span></button>
        <button type="button" className="qa-btn" onClick={() => nav('/search')}><Icon name="search" /><span>Search</span></button>
      </div>

      <div className="today-grid">
        <div className="today-main stagger">
          {data.running && (
            <Surface tone="accent" pad="md" className="running-card">
              <div className="running-info">
                <BubbleIcon name="focus" tone="purple" size="sm" />
                <div>
                  <div className="caption" style={{ color: 'var(--accent-lavender)' }}>Focus in progress</div>
                  <p className="small" style={{ margin: 0 }}>{data.running.planned_min} min session · {data.running.status}</p>
                </div>
              </div>
              <Button size="sm" variant="primary" icon="play" onClick={() => nav('/focus')}>Resume</Button>
            </Surface>
          )}

          {focusEntry && (
            <Surface tone="accent" pad="lg" className="now-card">
              <div className="caption" style={{ color: 'var(--accent-lavender)' }}>{current ? 'Now' : 'Next up'}</div>
              <h2>{focusEntry.title}</h2>
              <p className="muted small">{fmt.time(focusEntry.start, tz)}{focusEntry.end ? ` · ${minutesLabel((new Date(focusEntry.end).getTime() - new Date(focusEntry.start).getTime()) / 60000)}` : ''}{focusEntry.place ? ` · ${focusEntry.place}` : ''}</p>
              <div className="now-actions">
                <Button variant="primary" icon="play" onClick={() => nav('/focus')}>Start focus</Button>
                <Button variant="ghost" onClick={() => nav('/calendar')}>View day</Button>
              </div>
            </Surface>
          )}

          {data.overdueCount > 0 && (
            <Alert tone="warn" icon="alert">{data.overdueCount} task{data.overdueCount === 1 ? '' : 's'} overdue. <Link to="/tasks" className="link">Review</Link></Alert>
          )}

          <Section title="Important" action={<Link to="/tasks" className="link small">All tasks</Link>}>
            <Surface pad="none">
              {data.important.length ? (
                <ul className="list divided">{data.important.map((t) => <li key={t.id}><TaskRow task={t} onOpen={setOpen} /></li>)}</ul>
              ) : <p className="muted small" style={{ padding: 20 }}>No high-priority tasks open.</p>}
            </Surface>
          </Section>

          {data.habits.length > 0 && (
            <Section title="Habits" action={<Link to="/habits" className="link small">All habits</Link>}>
              <Surface pad="none">
                <ul className="list divided">
                  {data.habits.map((h) => (
                    <li key={h.id}>
                      <div className="row today-habit" data-done={h.stats.doneToday}>
                        <Checkbox checked={h.stats.doneToday} onChange={() => toggleHabit(h)} label={`Log ${h.title}`} />
                        <span className="row-main">
                          <span className="row-title">{h.title}</span>
                          <span className="row-sub">{h.stats.streak > 0 ? `${h.stats.streak} day streak` : 'Start today'}{h.stats.consistency > 0 ? ` · ${Math.round(h.stats.consistency * 100)}% consistency` : ''}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="habits-summary small muted">
                  {habitsDone}/{data.habits.length} done today
                </div>
              </Surface>
            </Section>
          )}

          {data.deadlines.length > 0 && (
            <Section title="Deadlines" action={<Link to="/deadlines" className="link small">All deadlines</Link>}>
              <Surface pad="none">
                <ul className="list divided">
                  {data.deadlines.map((d) => {
                    const cd = countdown(d.due_at, Date.now());
                    return (
                      <li key={d.id}>
                        <div className="row today-deadline" data-overdue={cd.overdue}>
                          <BubbleIcon name="flag" tone={cd.overdue ? 'plum' : 'lavender'} size="sm" />
                          <span className="row-main">
                            <span className="row-title">{d.title}</span>
                            <span className="row-sub">{fmt.dateTime(d.due_at, tz)} · {cd.text}</span>
                          </span>
                          {d.importance >= 4 && <span className="badge" data-tone="warn">High</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Surface>
            </Section>
          )}
        </div>

        <aside className="today-side stagger">
          <Surface>
            <div className="caption">Today's capacity</div>
            <div className="capacity-figure num">{Math.round(((cap.committed + cap.planned) / 60) * 10) / 10}<span className="muted"> / {Math.round(cap.available / 60 * 10) / 10} h</span></div>
            <ProgressBar value={load} label="Capacity used" />
            <p className="muted small" style={{ marginTop: 10 }}>{cap.overload ? 'Overloaded. Consider moving something.' : load > 0.5 ? 'A comfortable load with some room.' : 'Plenty of room today.'}</p>
          </Surface>

          {todays.length > 0 && (
            <Surface>
              <div className="caption" style={{ marginBottom: 8 }}>Schedule</div>
              <ol className="timeline">
                {todays.map((e) => (
                  <li key={e.id} data-now={e === current}>
                    <span className="t-time num">{fmt.time(e.start, tz)}</span>
                    <span className="t-title">{e.title}</span>
                  </li>
                ))}
              </ol>
            </Surface>
          )}

          {data.goals.length > 0 && (
            <Surface>
              <div className="caption" style={{ marginBottom: 12 }}>Goals in progress</div>
              <div className="today-goals">
                {data.goals.map((g) => (
                  <Link key={g.id} to="/goals" className="today-goal">
                    <div className="today-goal-top">
                      <span className="row-title">{g.title}</span>
                      {g.health.state !== 'healthy' && g.health.state !== 'active' && (
                        <span className="badge" data-tone={goalHealthTone[g.health.state]}>{g.health.state.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                    <div className="goal-foot">
                      <div style={{ flex: 1 }}><ProgressBar value={g.progress} label={`${g.title} progress`} /></div>
                      <span className="num small">{Math.round(g.progress * 100)}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Surface>
          )}

          <Surface tone="accent" className="agent-card">
            <div className="agent-suggest">
              <BubbleIcon name="agent" size="sm" />
              <div>
                <div className="caption" style={{ color: 'var(--accent-lavender)' }}>Agent</div>
                <p className="small" style={{ margin: '6px 0 12px' }}>Ask the Agent to plan your day, rebalance your week, or process your inbox.</p>
                <Button size="sm" onClick={() => nav('/agent')}>Open Agent <Icon name="chevron-right" /></Button>
              </div>
            </div>
          </Surface>
        </aside>
      </div>
      <TaskDetail task={open} onClose={() => setOpen(null)} />
    </>
  );
}
