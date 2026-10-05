import { useMemo, useState } from 'react';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import type { CalItem } from '../../core/types';
import { domainName } from '../../core/domains';
import { fmt, dayKey, addDays as addDayKey, monthStartKey, addMonths, parts } from '../../lib/tz';
import { Badge, Button, EmptyState, IconButton, PageHeader, Row, Surface, BubbleIcon, LoadingState, ErrorState } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import type { IconName } from '../../ui/Icon';

const KIND: Record<string, { label: string; icon: IconName; tone: string }> = {
  event: { label: 'Event', icon: 'calendar', tone: 'royal' },
  deadline: { label: 'Deadline', icon: 'flag', tone: 'plum' },
  focus_block: { label: 'Focus', icon: 'focus', tone: 'purple' },
  focus: { label: 'Focus', icon: 'focus', tone: 'purple' },
  task: { label: 'Task', icon: 'tasks', tone: 'graphite' },
  appointment: { label: 'Appointment', icon: 'clock', tone: 'slate' },
  time_block: { label: 'Block', icon: 'clock', tone: 'slate' },
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const { tz, settings } = useAuth();
  const ws = settings.weekStart;
  const todayK = dayKey(new Date(), tz);
  const [cursor, setCursor] = useState(monthStartKey(todayK));
  const [selected, setSelected] = useState(todayK);
  const [creating, setCreating] = useState(false);

  const monthEnd = addMonths(cursor, 1);
  const { data, loading, error, reload } = useApi<{ items: CalItem[]; conflicts: unknown[] }>(`/calendar?from=${cursor}&to=${monthEnd}`);

  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    (data?.items ?? []).forEach((e) => {
      const k = dayKey(new Date(e.start), tz);
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return m;
  }, [data, tz]);

  const firstParts = parts(new Date(cursor + 'T12:00:00Z'), 'UTC');
  const lead = (firstParts.dow - ws + 7) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDayKey(cursor, i - lead));
  const lastWeek = cells.slice(35);
  const inLastWeek = lastWeek.some((c) => c.startsWith(cursor.slice(0, 7)));
  const rows = inLastWeek ? 6 : 5;

  const entries = (byDay.get(selected) ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));

  return (
    <>
      <PageHeader eyebrow="Calendar" title={fmt.dayKey(cursor, { month: 'long', year: 'numeric' })} actions={
        <div className="cal-nav">
          <IconButton icon="chevron-left" label="Previous month" onClick={() => setCursor(addMonths(cursor, -1))} />
          <Button size="sm" onClick={() => { setCursor(monthStartKey(todayK)); setSelected(todayK); }}>Today</Button>
          <IconButton icon="chevron-right" label="Next month" onClick={() => setCursor(addMonths(cursor, 1))} />
        </div>
      } />
      <div className="cal-layout">
        <Surface pad="none" className="cal-surface">
          {loading && !data && <div style={{ padding: 12 }}><LoadingState label="Loading calendar" /></div>}
          {error && !data && <ErrorState text={error} onRetry={reload} />}
          {data && (
            <div className="cal-grid" role="grid" aria-label={fmt.dayKey(cursor, { month: 'long', year: 'numeric' })}>
              {WEEKDAYS.map((w) => <div key={w} className="cal-dow" role="columnheader">{w}</div>)}
              {cells.slice(0, rows * 7).map((c) => {
                const list = byDay.get(c) ?? [];
                const kinds = Array.from(new Set(list.map((e) => e.kind))).slice(0, 3);
                return (
                  <button key={c} type="button" role="gridcell" className="cal-cell"
                    data-today={c === todayK} data-selected={c === selected} data-outside={!c.startsWith(cursor.slice(0, 7))}
                    aria-label={`${fmt.dayKey(c, { weekday: 'long', month: 'long', day: 'numeric' })}${list.length ? `, ${list.length} items` : ''}`}
                    aria-selected={c === selected}
                    onClick={() => setSelected(c)}>
                    <span className="cal-num num">{parseInt(c.slice(8))}</span>
                    <span className="cal-dots">{kinds.map((k) => <i key={k} data-kind={k} />)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Surface>

        <section className="cal-details" aria-live="polite">
          <div className="caption">{selected === todayK ? 'Today' : 'Selected'}</div>
          <h2 style={{ marginBottom: 12 }}>{fmt.dayKey(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          {entries.length === 0 ? (
            <EmptyState icon="calendar" title="A clear day" text="Nothing scheduled. Create an event or focus block." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New event</Button>} />
          ) : (
            <div className="list stagger" key={selected}>
              {entries.map((e) => {
                const k = KIND[e.kind] ?? KIND.event;
                return (
                  <Row as="div" key={e.id}
                    leading={<BubbleIcon name={k.icon} tone={k.tone} size="sm" />}
                    title={e.title}
                    subtitle={`${fmt.time(e.start, tz)}${e.end ? ` · ${minutesLabel((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000)}` : ''} · ${domainName(e.domain)}${e.place ? ` · ${e.place}` : ''}`}
                    trailing={<Badge tone={e.kind === 'deadline' ? 'danger' : undefined}>{k.label}</Badge>}
                  />
                );
              })}
            </div>
          )}
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)} style={{ marginTop: 12 }}>New event</Button>
        </section>
      </div>
      <EntityForm entity="events" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

import { minutesLabel } from '../../lib/tz';
