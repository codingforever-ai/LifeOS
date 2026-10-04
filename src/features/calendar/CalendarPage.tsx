import { useMemo, useState } from 'react';
import { demoCalendar } from '../../data/demo';
import type { CalendarEntry, EventKind } from '../../core/types';
import { domainName } from '../../core/domains';
import { addDays, dateKey, fmtLong, fmtMonth, fmtTime, sameDay, startOfDay } from '../../lib/date';
import { Badge, Button, EmptyState, IconButton, PageHeader, Row, Surface, BubbleIcon } from '../../ui/primitives';
import type { IconName } from '../../ui/Icon';

const KIND: Record<EventKind, { label: string; icon: IconName; tone: 'purple' | 'plum' | 'royal' | 'graphite' | 'slate' | 'mist' }> = {
  event: { label: 'Event', icon: 'calendar', tone: 'royal' },
  deadline: { label: 'Deadline', icon: 'flag', tone: 'plum' },
  focus: { label: 'Focus', icon: 'focus', tone: 'purple' },
  task: { label: 'Task', icon: 'tasks', tone: 'graphite' },
  habit: { label: 'Habit', icon: 'trend', tone: 'mist' },
  appointment: { label: 'Appointment', icon: 'clock', tone: 'slate' },
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEntry[]>();
    demoCalendar.forEach((e) => m.set(dateKey(e.date), [...(m.get(dateKey(e.date)) ?? []), e]));
    return m;
  }, []);

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
  const rows = cells.slice(35).every((c) => c.getMonth() !== cursor.getMonth()) ? 5 : 6;

  const move = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const goToday = () => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today); };

  const entries = (byDay.get(dateKey(selected)) ?? []).slice().sort((a, b) => (a.startHour ?? -1) - (b.startHour ?? -1));

  return (
    <>
      <PageHeader eyebrow="Calendar" title={fmtMonth(cursor)} actions={
        <div className="cal-nav">
          <IconButton icon="chevron-left" label="Previous month" onClick={() => move(-1)} />
          <Button size="sm" onClick={goToday}>Today</Button>
          <IconButton icon="chevron-right" label="Next month" onClick={() => move(1)} />
        </div>
      } />
      <div className="cal-layout">
        <Surface pad="none" className="cal-surface">
          <div className="cal-grid" role="grid" aria-label={fmtMonth(cursor)}>
            {WEEKDAYS.map((w) => <div key={w} className="cal-dow" role="columnheader">{w}</div>)}
            {cells.slice(0, rows * 7).map((c) => {
              const list = byDay.get(dateKey(c)) ?? [];
              const kinds = Array.from(new Set(list.map((e) => e.kind))).slice(0, 3);
              return (
                <button
                  key={c.toISOString()} type="button" role="gridcell" className="cal-cell"
                  data-today={sameDay(c, today)} data-selected={sameDay(c, selected)} data-outside={c.getMonth() !== cursor.getMonth()}
                  aria-label={`${fmtLong(c)}${list.length ? `, ${list.length} items` : ''}`} aria-selected={sameDay(c, selected)}
                  onClick={() => { setSelected(c); if (c.getMonth() !== cursor.getMonth()) setCursor(new Date(c.getFullYear(), c.getMonth(), 1)); }}
                >
                  <span className="cal-num num">{c.getDate()}</span>
                  <span className="cal-dots">{kinds.map((k) => <i key={k} data-kind={k} />)}</span>
                </button>
              );
            })}
          </div>
        </Surface>

        <section className="cal-details" aria-live="polite">
          <div className="caption">{sameDay(selected, today) ? 'Today' : 'Selected'}</div>
          <h2 style={{ marginBottom: 12 }}>{fmtLong(selected)}</h2>
          {entries.length === 0 ? (
            <EmptyState icon="calendar" title="A clear day" text="Nothing scheduled. Events, deadlines and focus blocks will appear here." />
          ) : (
            <div className="list stagger" key={dateKey(selected)}>
              {entries.map((e) => (
                <Row
                  as="div" key={e.id}
                  leading={<BubbleIcon name={KIND[e.kind].icon} tone={KIND[e.kind].tone} size="sm" />}
                  title={e.title}
                  subtitle={`${e.startHour !== undefined ? `${fmtTime(e.startHour, e.startMin)} · ${e.durationMin} min · ` : ''}${domainName(e.domain)}${e.place ? ` · ${e.place}` : ''}`}
                  trailing={<Badge tone={e.kind === 'deadline' ? 'danger' : undefined}>{KIND[e.kind].label}</Badge>}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
