import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { fmt, relDay, countdown } from '../../lib/tz';
import { greeting } from '../../lib/date';
import { Badge, BubbleIcon, Button, ErrorState, LoadingState, ProgressBar, Row, Section, Surface } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { TaskDetail, TaskRow } from '../tasks/TaskParts';
import { api } from '../../api/client';
import type { Task } from '../../core/types';

interface TodayData {
  day: string; tz: string; state: string; why: string[];
  schedule: { source: string; id: string; title: string; kind: string; domain: string; start: string; end: string | null; allDay: boolean; place?: string }[];
  important: Task[]; overdueCount: number;
  deadlines: { id: string; title: string; due_at: string; priority: string; importance: number; domain: string }[];
  goals: { id: string; title: string; horizon: string | null; progress: number; health: { state: string } }[];
  capacity: { available: number; planned: number; committed: number; remaining: number; overload: boolean; workDay: boolean };
  habits: { id: string; title: string; stats: { doneToday: boolean; streak: number } }[];
  running: { id: string; accumulated_ms: number; planned_min: number } | null;
  inbox: number; alerts: { id: string; kind: string; title: string }[];
}

const STATE_MSG: Record<string, string> = {
  no_commitments: 'Nothing is scheduled or due today. A good day to make progress on what matters.',
  overloaded: 'Today is full. Consider moving something.',
  behind: 'You have overdue tasks. Let\'s catch up.',
  deadline_approaching: 'A deadline is approaching soon.',
  focus_opportunity: 'You have open time today — a good day for deep work.',
  underplanned: 'Plenty of room today. Plan something meaningful.',
  normal: 'A balanced day ahead.',
};

export default function TodayPage() {
  const { user } = useAuth();
  const { tz } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState<Task | null>(null);
  const { data, loading, error, reload } = useApi<TodayData>('/today');
  const [quick, setQuick] = useState('');
  const [busy, setBusy] = useState(false);
  const addQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quick.trim();
    if (!title || busy) return;
    setBusy(true);
    try { await api.post('/e/tasks', { title }); setQuick(''); reload(); } finally { setBusy(false); }
  };

  if (loading && !data) return <div style={{ padding: 32 }}><LoadingState rows={4} /></div>;
  if (error && !data) return <ErrorState text={error} onRetry={reload} />;
  const t = data!;

  const now = new Date();
  const schedule = t.schedule.filter((e) => !e.allDay).sort((a, b) => a.start.localeCompare(b.start));
  const current = schedule.find((e) => {
    const s = new Date(e.start).getTime();
    const endTime = e.end ? new Date(e.end).getTime() : s + 3600000;
    return s <= now.getTime() && now.getTime() < endTime;
  });
  const next = schedule.find((e) => new Date(e.start).getTime() > now.getTime());
  const focusEntry = current ?? next ?? schedule[0];

  const capPct = t.capacity.available > 0 ? Math.min(1, (t.capacity.planned + t.capacity.committed) / t.capacity.available) : 0;
  const usedMin = t.capacity.planned + t.capacity.committed;

  return (
    <>
      <header className="today-hero">
        <div className="caption">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1>{greeting(now)}, {user?.name ?? 'there'}.</h1>
        <p className="muted lead">{t.why?.[0] ?? STATE_MSG[t.state] ?? STATE_MSG.normal}</p>
      </header>

      <form onSubmit={addQuick} className="search-bar" style={{ marginBottom: 16 }}>
        <input className="input" style={{ flex: 1 }} aria-label="Quick add task" placeholder="Quick add a task for today… (Enter)" value={quick} onChange={(e) => setQuick(e.target.value)} disabled={busy} />
      </form>

      <div className="today-grid">
        <div className="today-main stagger">
          {focusEntry && (
            <Surface tone="accent" pad="lg" className="now-card">
              <div className="caption" style={{ color: 'var(--accent-lavender)' }}>{current ? 'Now' : 'Next up'}</div>
              <h2>{focusEntry.title}</h2>
              <p className="muted small">
                {fmt.time(focusEntry.start, tz)}{focusEntry.end ? ` – ${fmt.time(focusEntry.end, tz)}` : ''}{focusEntry.place ? ` · ${focusEntry.place}` : ''}
              </p>
              <div className="now-actions">
                <Button variant="primary" icon="play" onClick={() => nav('/focus')}>Start focus</Button>
                <Button variant="ghost" onClick={() => nav('/calendar')}>View day</Button>
              </div>
            </Surface>
          )}

          <Section title="Important" action={<Link to="/tasks" className="link small">All tasks</Link>}>
            <Surface pad="none">
              {t.important.length ? (
                <ul className="list divided">{t.important.map((task) => <li key={task.id}><TaskRow task={task} onOpen={setOpen} /></li>)}</ul>
              ) : <p className="muted small" style={{ padding: 20 }}>No high-priority tasks open.</p>}
            </Surface>
          </Section>

          <Section title="Upcoming deadlines" action={<Link to="/deadlines" className="link small">All deadlines</Link>}>
            <div className="list">
              {t.deadlines.length === 0 && <p className="muted small" style={{ padding: 8 }}>No deadlines in the next week.</p>}
              {t.deadlines.map((d) => {
                const c = countdown(d.due_at);
                return (
                  <Row as="div" key={d.id} leading={<BubbleIcon name="flag" tone="plum" size="sm" />} title={d.title}
                    subtitle={c.overdue ? c.text : `${relDay(d.due_at, tz)} · ${c.text}`}
                    trailing={<Badge tone={c.overdue ? 'danger' : d.priority === 'high' ? 'accent' : undefined}>{d.priority}</Badge>} />
                );
              })}
            </div>
          </Section>

          <Section title="Goals in focus" action={<Link to="/goals" className="link small">All goals</Link>}>
            <div className="goal-pair">
              {t.goals.map((g) => (
                <Link to="/goals" key={g.id} className="surface goal-mini">
                  <div className="ring-sm"><ProgressBar value={g.progress} label={g.title} /></div>
                  <span className="row-main"><span className="row-title">{g.title}</span><span className="row-sub">{Math.round(g.progress * 100)}% · {g.horizon}</span></span>
                </Link>
              ))}
              {t.goals.length === 0 && <p className="muted small">No active goals.</p>}
            </div>
          </Section>

          {t.habits.length > 0 && (
            <Section title="Habits today" action={<Link to="/habits" className="link small">All habits</Link>}>
              <Surface pad="none">
                <ul className="list divided">
                  {t.habits.map((h) => (
                    <li key={h.id}><Row as="div" leading={<BubbleIcon name="repeat" tone="mist" size="sm" />} title={h.title} subtitle={`Streak: ${h.stats.streak}`} trailing={h.stats.doneToday ? <Badge tone="ok">Done</Badge> : <Badge>Due</Badge>} /></li>
                  ))}
                </ul>
              </Surface>
            </Section>
          )}
        </div>

        <aside className="today-side stagger">
          <Surface>
            <div className="caption">Today's capacity</div>
            <div className="capacity-figure num">{Math.round((usedMin / 60) * 10) / 10}<span className="muted"> / {Math.round(t.capacity.available / 60)} h</span></div>
            <ProgressBar value={capPct} label="Capacity used" />
            <p className="muted small" style={{ marginTop: 10 }}>
              {t.capacity.overload ? 'Overloaded — move something.' : capPct > 0.7 ? 'A full day with little room.' : capPct > 0.3 ? 'A comfortable load.' : 'Plenty of room today.'}
            </p>
          </Surface>

          <Surface>
            <div className="caption" style={{ marginBottom: 8 }}>Schedule</div>
            {schedule.length === 0 ? <p className="muted small">Nothing scheduled today.</p> : (
              <ol className="timeline">
                {schedule.map((e) => (
                  <li key={e.id} data-now={e === current}>
                    <span className="t-time num">{fmt.time(e.start, tz)}</span>
                    <span className="t-title">{e.title}</span>
                  </li>
                ))}
              </ol>
            )}
          </Surface>

          <Surface tone="accent">
            <div className="agent-suggest">
              <BubbleIcon name="agent" size="sm" />
              <div>
                <div className="caption" style={{ color: 'var(--accent-lavender)' }}>Agent</div>
                <p className="small" style={{ margin: '6px 0 12px' }}>Ask the Agent to fix your week, plan study sessions, or reschedule around a deadline.</p>
                <Button size="sm" onClick={() => nav('/agent')}>Open Agent <Icon name="chevron-right" /></Button>
              </div>
            </div>
          </Surface>

          {t.alerts.length > 0 && (
            <Surface>
              <div className="caption" style={{ marginBottom: 8 }}>Alerts</div>
              <div className="list">
                {t.alerts.map((a) => <Row as="div" key={a.id} leading={<BubbleIcon name="bell" tone="plum" size="sm" />} title={a.title} subtitle={a.kind} />)}
              </div>
            </Surface>
          )}
        </aside>
      </div>
      <TaskDetail task={open} onClose={() => setOpen(null)} />
    </>
  );
}
