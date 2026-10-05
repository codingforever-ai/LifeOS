import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { api } from '../../api/client';
import type { Task, CalItem } from '../../core/types';
import { domainName } from '../../core/domains';
import { fmt, relDay, minutesLabel, dayKey } from '../../lib/tz';
import { Alert, Badge, BubbleIcon, Button, ProgressBar, ProgressRing, Row, Section, Surface, LoadingState, ErrorState } from '../../ui/primitives';
import { IconTile, DomainIcon } from '../../ui/icons';
import { TaskDetail, TaskRow } from '../tasks/TaskParts';

interface TodayData {
  day: string; tz: string; state: string; why: string[];
  schedule: CalItem[]; important: Task[]; overdueCount: number;
  deadlines: Record<string, unknown>[]; goals: Record<string, unknown>[];
  capacity: { day: string; available: number; committed: number; planned: number; remaining: number; overload: boolean; tasks: number };
  habits: Record<string, unknown>[]; running: Record<string, unknown> | null; inbox: Record<string, unknown>[]; alerts: Record<string, unknown>[];
}

export default function TodayPage() {
  const { user, tz } = useAuth();
  const { progress, goals } = useCore();
  const nav = useNavigate();
  const [open, setOpen] = useState<Task | null>(null);
  const { data, loading, error, reload } = useApi<TodayData>('/today');

  if (loading) return <div style={{ padding: 24 }}><LoadingState label="Loading today" /></div>;
  if (error) return <ErrorState text={error} onRetry={reload} />;
  if (!data) return null;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todays = data.schedule.filter((e) => e.start);
  const current = todays.find((e) => {
    const s = new Date(e.start).getHours() * 60 + new Date(e.start).getMinutes();
    const dur = e.end ? (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000 : 60;
    return s <= nowMin && nowMin < s + dur;
  });
  const next = todays.find((e) => new Date(e.start).getHours() * 60 + new Date(e.start).getMinutes() > nowMin);
  const focusEntry = current ?? next ?? todays[0];

  const cap = data.capacity;
  const load = cap.available > 0 ? Math.min(1, (cap.committed + cap.planned) / cap.available) : 0;
  const stateMsg: Record<string, string> = {
    normal: 'A balanced day with room for what matters.',
    overloaded: 'Today is full. Consider moving something.',
    behind: 'You have overdue work. Let\u2019s catch up.',
    deadline_approaching: 'Deadlines are approaching.',
    underplanned: 'Plenty of room today.',
    no_commitments: 'Nothing scheduled today. A good day to plan ahead.',
  };

  return (
    <>
      <header className="today-hero">
        <div className="caption">{fmt.dateLong(now.toISOString(), tz)}</div>
        <h1>{now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'}, {user?.name}.</h1>
        <p className="muted lead">{stateMsg[data.state] ?? stateMsg.normal}</p>
        {data.why.length > 0 && <Alert tone="accent" icon="info">{data.why.join(' ')}</Alert>}
      </header>

      <div className="today-grid">
        <div className="today-main stagger">
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

          {data.deadlines.length > 0 && (
            <Section title="Upcoming deadlines" action={<Link to="/deadlines" className="link small">All</Link>}>
              <div className="list">
                {data.deadlines.map((d: Record<string, unknown>, i) => (
                  <Row as="div" key={i} leading={<BubbleIcon name="flag" tone="plum" size="sm" />} title={String(d.title)} subtitle={d.due_at ? relDay(String(d.due_at), tz) : ''} />
                ))}
              </div>
            </Section>
          )}

          {goals.length > 0 && (
            <Section title="Goals in focus" action={<Link to="/goals" className="link small">All</Link>}>
              <div className="goal-pair">
                {goals.slice(0, 2).map((g) => {
                  const p = progress.goals[g.id]?.progress ?? 0;
                  return (
                    <Link to="/goals" key={g.id} className="surface goal-mini">
                      <ProgressRing value={p} label={g.title} size={48}>{Math.round(p * 100)}</ProgressRing>
                      <span className="row-main"><span className="row-title">{g.title}</span><span className="row-sub">{g.horizon}</span></span>
                    </Link>
                  );
                })}
              </div>
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

          <Surface tone="accent">
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

import { Icon } from '../../ui/Icon';
