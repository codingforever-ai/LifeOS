import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCore } from '../../core/store';
import type { Task } from '../../core/types';
import { goalProgress, pct } from '../../core/progress';
import { demoCalendar, DEMO_USER } from '../../data/demo';
import { diffDays, fmtLong, fmtTime, greeting, relativeDay, sameDay } from '../../lib/date';
import { Alert, BubbleIcon, Button, ProgressBar, ProgressRing, Row, Section, Surface } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { TaskDetail, TaskRow } from '../tasks/TaskParts';

export default function TodayPage() {
  const { tasks, goals, projects } = useCore();
  const nav = useNavigate();
  const [open, setOpen] = useState<Task | null>(null);
  const now = new Date();

  const schedule = demoCalendar
    .filter((e) => sameDay(e.date, now) && e.startHour !== undefined)
    .sort((a, b) => a.startHour! * 60 + (a.startMin ?? 0) - (b.startHour! * 60 + (b.startMin ?? 0)));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const current = schedule.find((e) => e.startHour! * 60 + (e.startMin ?? 0) <= nowMin && nowMin < e.startHour! * 60 + (e.startMin ?? 0) + (e.durationMin ?? 0));
  const next = schedule.find((e) => e.startHour! * 60 + (e.startMin ?? 0) > nowMin);
  const focusEntry = current ?? next ?? schedule[0];

  const important = tasks.filter((t) => !t.done && t.priority === 'high').slice(0, 3);
  const deadlines = demoCalendar.filter((e) => e.kind === 'deadline' && diffDays(e.date, now) >= 0).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 3);
  const activeGoals = goals.slice(0, 2);

  const plannedMin = tasks.filter((t) => !t.done && t.due && diffDays(t.due, now) <= 0).reduce((s, t) => s + (t.estimateMin ?? 0), 0);
  const meetingsMin = schedule.filter((e) => e.kind === 'event' || e.kind === 'appointment').reduce((s, e) => s + (e.durationMin ?? 0), 0);
  const capacityMin = 8 * 60;
  const load = Math.min(1, (plannedMin + meetingsMin) / capacityMin);

  return (
    <>
      <header className="today-hero">
        <div className="caption">{fmtLong(now)}</div>
        <h1>{greeting(now)}, {DEMO_USER.name}.</h1>
        <p className="muted lead">
          {important.length > 0 ? `${important.length} things matter most today. Everything else can wait.` : 'Nothing urgent today. A good day to make progress on what matters.'}
        </p>
      </header>

      <div className="today-grid">
        <div className="today-main stagger">
          {focusEntry && (
            <Surface tone="accent" pad="lg" className="now-card">
              <div className="caption" style={{ color: 'var(--accent-lavender)' }}>{current ? 'Now' : 'Next up'}</div>
              <h2>{focusEntry.title}</h2>
              <p className="muted small">
                {fmtTime(focusEntry.startHour!, focusEntry.startMin)} · {focusEntry.durationMin} min{focusEntry.place ? ` · ${focusEntry.place}` : ''}
              </p>
              <div className="now-actions">
                <Button variant="primary" icon="play" onClick={() => nav('/focus')}>Start focus</Button>
                <Button variant="ghost" onClick={() => nav('/calendar')}>View day</Button>
              </div>
            </Surface>
          )}

          <Section title="Important" action={<Link to="/tasks" className="link small">All tasks</Link>}>
            <Surface pad="none">
              {important.length ? (
                <ul className="list divided">{important.map((t) => <li key={t.id}><TaskRow task={t} onOpen={setOpen} /></li>)}</ul>
              ) : <p className="muted small" style={{ padding: 20 }}>No high-priority tasks open.</p>}
            </Surface>
          </Section>

          <Section title="Upcoming deadlines">
            <div className="list">
              {deadlines.map((e) => (
                <Row as="div" key={e.id} leading={<BubbleIcon name="flag" tone="plum" size="sm" />} title={e.title} subtitle={relativeDay(e.date)} />
              ))}
            </div>
          </Section>

          <Section title="Goals in focus">
            <div className="goal-pair">
              {activeGoals.map((g) => {
                const p = goalProgress(g, projects);
                return (
                  <Link to="/goals" key={g.id} className="surface goal-mini">
                    <ProgressRing value={p} label={g.title} size={48}>{pct(p)}</ProgressRing>
                    <span className="row-main"><span className="row-title">{g.title}</span><span className="row-sub">{g.horizon}</span></span>
                  </Link>
                );
              })}
            </div>
          </Section>
        </div>

        <aside className="today-side stagger">
          <Surface>
            <div className="caption">Today’s capacity</div>
            <div className="capacity-figure num">{Math.round(((plannedMin + meetingsMin) / 60) * 10) / 10}<span className="muted"> / {capacityMin / 60} h</span></div>
            <ProgressBar value={load} label="Capacity used" />
            <p className="muted small" style={{ marginTop: 10 }}>{load > 0.85 ? 'Today is full. Consider moving something.' : load > 0.5 ? 'A comfortable load with some room.' : 'Plenty of room today.'}</p>
          </Surface>

          <Surface>
            <div className="caption" style={{ marginBottom: 8 }}>Schedule</div>
            <ol className="timeline">
              {schedule.map((e) => (
                <li key={e.id} data-now={e === current}>
                  <span className="t-time num">{fmtTime(e.startHour!, e.startMin)}</span>
                  <span className="t-title">{e.title}</span>
                </li>
              ))}
            </ol>
          </Surface>

          <Surface tone="accent">
            <div className="agent-suggest">
              <BubbleIcon name="agent" size="sm" />
              <div>
                <div className="caption" style={{ color: 'var(--accent-lavender)' }}>Agent suggestion · demo</div>
                <p className="small" style={{ margin: '6px 0 12px' }}>Your 11:30 sync overlaps with deep work. Moving the motion guidelines block to 14:00 would keep your morning clear.</p>
                <Button size="sm" onClick={() => nav('/agent')}>Review <Icon name="chevron-right" /></Button>
              </div>
            </div>
          </Surface>
          <Alert icon="info">Phase 1 shows demo data. Nothing here is saved.</Alert>
        </aside>
      </div>
      <TaskDetail task={open} onClose={() => setOpen(null)} />
    </>
  );
}
