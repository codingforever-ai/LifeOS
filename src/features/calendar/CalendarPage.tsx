import { useMemo, useState } from 'react';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import type { CalItem } from '../../core/types';
import { domainName } from '../../core/domains';
import { fmt, dayKey, addDays as addDayKey, monthStartKey, addMonths, parts, weekStart as weekStartKey, dowOf, minutesLabel } from '../../lib/tz';
import { Badge, Button, EmptyState, IconButton, PageHeader, Row, Surface, BubbleIcon, LoadingState, ErrorState, Tabs } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import type { IconName } from '../../ui/Icon';
import { CATEGORY_LABEL, holidaysOn, type Holiday } from './holidays';
import { UpcomingHolidays } from './UpcomingHolidays';

type View = 'month' | 'week' | 'day' | 'agenda';

const KIND: Record<string, { label: string; icon: IconName; tone: string }> = {
  event: { label: 'Event', icon: 'calendar', tone: 'royal' },
  deadline: { label: 'Deadline', icon: 'flag', tone: 'plum' },
  focus_block: { label: 'Focus', icon: 'focus', tone: 'purple' },
  focus: { label: 'Focus', icon: 'focus', tone: 'purple' },
  task: { label: 'Task', icon: 'tasks', tone: 'graphite' },
  appointment: { label: 'Appointment', icon: 'clock', tone: 'slate' },
  time_block: { label: 'Block', icon: 'clock', tone: 'slate' },
};

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function entrySubtitle(e: CalItem, tz: string): string {
  const dur = e.end ? (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000 : null;
  return `${fmt.time(e.start, tz)}${dur ? ` · ${minutesLabel(dur)}` : ''} · ${domainName(e.domain)}${e.place ? ` · ${e.place}` : ''}`;
}

/** Shared entry row — used by month details, day view and agenda. */
function CalEntry({ e, tz }: { e: CalItem; tz: string }) {
  const k = KIND[e.kind] ?? KIND.event;
  return (
    <Row as="div"
      leading={<BubbleIcon name={k.icon} tone={k.tone} size="sm" />}
      title={e.title}
      subtitle={entrySubtitle(e, tz)}
      trailing={<Badge tone={e.kind === 'deadline' ? 'danger' : undefined}>{k.label}</Badge>}
    />
  );
}

/** Holiday row — shared across month details, day view and agenda. */
function HolidayRow({ h }: { h: Holiday }) {
  return (
    <Row as="div" key={h.id}
      leading={<span className="holiday-dot" aria-hidden="true" />}
      title={h.name}
      subtitle={CATEGORY_LABEL[h.category]}
      trailing={h.isTentative ? <Badge tone="warn">Tentative</Badge> : undefined}
    />
  );
}

export default function CalendarPage() {
  const { tz, settings } = useAuth();
  const ws = settings.weekStart;
  const todayK = dayKey(new Date(), tz);
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(monthStartKey(todayK));
  const [selected, setSelected] = useState(todayK);
  const [creating, setCreating] = useState(false);

  // API range — only the date range changes per view, never the data model.
  // The server treats `to` as inclusive then adds +1 day (exclusive end), so we pass the last day we want.
  const range = useMemo(() => {
    if (view === 'month') return { from: cursor, to: addMonths(cursor, 1) };
    if (view === 'week') return { from: cursor, to: addDayKey(cursor, 6) };
    if (view === 'day') return { from: cursor, to: cursor };
    return { from: todayK, to: addDayKey(todayK, 13) }; // agenda: 14 days from today
  }, [view, cursor, todayK]);

  const { data, loading, error, reload } = useApi<{ items: CalItem[]; conflicts: unknown[] }>(`/calendar?from=${range.from}&to=${range.to}`);

  // Single shared byDay map — every view reads from the same records.
  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    (data?.items ?? []).forEach((e) => {
      const k = dayKey(new Date(e.start), tz);
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return m;
  }, [data, tz]);

  const dayEntries = (k: string) => (byDay.get(k) ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));

  // Weekday labels rotated by the user's week-start setting.
  const orderedDows = Array.from({ length: 7 }, (_, i) => DOW_LABELS[(ws + i) % 7]);

  // Navigation — prev/next moves by the appropriate unit for each view.
  const goPrev = () => {
    if (view === 'month') setCursor(addMonths(cursor, -1));
    else if (view === 'week') setCursor(addDayKey(cursor, -7));
    else if (view === 'day') { const d = addDayKey(cursor, -1); setCursor(d); setSelected(d); }
  };
  const goNext = () => {
    if (view === 'month') setCursor(addMonths(cursor, 1));
    else if (view === 'week') setCursor(addDayKey(cursor, 7));
    else if (view === 'day') { const d = addDayKey(cursor, 1); setCursor(d); setSelected(d); }
  };
  const goToday = () => {
    setSelected(todayK);
    if (view === 'month') setCursor(monthStartKey(todayK));
    else if (view === 'week') setCursor(weekStartKey(todayK, ws));
    else if (view === 'day') setCursor(todayK);
  };

  // Switching view re-anchors the cursor to the currently selected date.
  const changeView = (v: View) => {
    setView(v);
    if (v === 'month') setCursor(monthStartKey(selected));
    else if (v === 'week') setCursor(weekStartKey(selected, ws));
    else if (v === 'day') setCursor(selected);
  };

  // Picking a holiday or navigating from the sidebar.
  const pickDate = (date: string) => {
    setSelected(date);
    if (view === 'month') setCursor(monthStartKey(date));
    else if (view === 'week') setCursor(weekStartKey(date, ws));
    else if (view === 'day') setCursor(date);
  };

  const title = useMemo(() => {
    if (view === 'month') return fmt.dayKey(cursor, { month: 'long', year: 'numeric' });
    if (view === 'week') return `${fmt.dayKey(cursor, { month: 'short', day: 'numeric' })} – ${fmt.dayKey(addDayKey(cursor, 6), { month: 'short', day: 'numeric' })}`;
    if (view === 'day') return fmt.dayKey(cursor, { weekday: 'long', month: 'long', day: 'numeric' });
    return 'Next 14 days';
  }, [view, cursor]);

  // Month grid (unchanged logic)
  const firstParts = parts(new Date(cursor + 'T12:00:00Z'), 'UTC');
  const lead = (firstParts.dow - ws + 7) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDayKey(cursor, i - lead));
  const lastWeek = cells.slice(35);
  const inLastWeek = lastWeek.some((c) => c.startsWith(cursor.slice(0, 7)));
  const rows = inLastWeek ? 6 : 5;

  const entries = dayEntries(selected);
  const selectedHolidays = holidaysOn(selected);
  const dayHolidays = holidaysOn(cursor);
  const dayItems = dayEntries(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDayKey(cursor, i));
  const agendaDays = Array.from({ length: 14 }, (_, i) => addDayKey(todayK, i));

  return (
    <>
      <PageHeader eyebrow="Calendar" title={title} actions={
        <div className="cal-nav">
          {view !== 'agenda' && <IconButton icon="chevron-left" label={`Previous ${view}`} onClick={goPrev} />}
          <Button size="sm" onClick={goToday}>Today</Button>
          {view !== 'agenda' && <IconButton icon="chevron-right" label={`Next ${view}`} onClick={goNext} />}
        </div>
      } />
      <div className="cal-views">
        <Tabs value={view} onChange={(v) => changeView(v)} options={[
          { value: 'month', label: 'Month' },
          { value: 'week', label: 'Week' },
          { value: 'day', label: 'Day' },
          { value: 'agenda', label: 'Agenda' },
        ]} label="Calendar view" />
      </div>
      <div className="cal-layout">
        <Surface pad="none" className="cal-surface">
          {loading && !data && <div style={{ padding: 12 }}><LoadingState label="Loading calendar" /></div>}
          {error && !data && <ErrorState text={error} onRetry={reload} />}

          {/* MONTH — unchanged grid + holiday highlighting */}
          {data && view === 'month' && (
            <div className="cal-grid" role="grid" aria-label={title}>
              {orderedDows.map((w) => <div key={w} className="cal-dow" role="columnheader">{w}</div>)}
              {cells.slice(0, rows * 7).map((c) => {
                const list = byDay.get(c) ?? [];
                const kinds = Array.from(new Set(list.map((e) => e.kind))).slice(0, 3);
                const holidays = holidaysOn(c);
                return (
                  <button key={c} type="button" role="gridcell" className="cal-cell"
                    data-today={c === todayK} data-selected={c === selected} data-outside={!c.startsWith(cursor.slice(0, 7))}
                    data-holiday={holidays.length > 0}
                    title={holidays.length ? holidays.map((h) => h.name).join(' · ') : undefined}
                    aria-label={`${fmt.dayKey(c, { weekday: 'long', month: 'long', day: 'numeric' })}${list.length ? `, ${list.length} items` : ''}${holidays.length ? `, holiday: ${holidays.map((h) => h.name).join(', ')}` : ''}`}
                    aria-selected={c === selected}
                    onClick={() => setSelected(c)}>
                    <span className="cal-num num">{parseInt(c.slice(8))}</span>
                    <span className="cal-dots">{kinds.map((k) => <i key={k} data-kind={k} />)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* WEEK — 7 consecutive days, week-start aware */}
          {data && view === 'week' && (
            <div className="cal-week" role="grid" aria-label={title}>
              {weekDays.map((k) => {
                const list = dayEntries(k);
                const holidays = holidaysOn(k);
                return (
                  <div key={k} className="cal-week-day"
                    data-today={k === todayK}
                    data-holiday={holidays.length > 0}
                    data-selected={k === selected}
                    role="button" tabIndex={0}
                    onClick={() => setSelected(k)}>
                    <div className="cal-week-dow">
                      {DOW_LABELS[dowOf(k)]}
                      <span className="num" style={{ marginLeft: 6 }}>{parseInt(k.slice(8))}</span>
                      {holidays.length > 0 && <span className="holiday-dot" style={{ marginLeft: 6 }} />}
                    </div>
                    <div className="cal-week-events">
                      {holidays.map((h) => (
                        <div key={h.id} className="cal-week-event" style={{ color: 'var(--holiday)' }}>
                          <span className="ev-time">Holiday</span>
                          <span>{h.name}</span>
                        </div>
                      ))}
                      {list.map((e) => (
                        <div key={e.id} className="cal-week-event">
                          <span className="ev-time">{fmt.time(e.start, tz)}</span>
                          <span>{e.title}</span>
                        </div>
                      ))}
                      {list.length === 0 && holidays.length === 0 && <span className="cal-week-empty">No events</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DAY — single selected day */}
          {data && view === 'day' && (
            <div className="cal-day-view" style={{ padding: 'var(--s3) var(--s4)' }}>
              {dayHolidays.length > 0 && (
                <div className="holiday-today">
                  {dayHolidays.map((h) => <HolidayRow key={h.id} h={h} />)}
                </div>
              )}
              {dayItems.length === 0 ? (
                <EmptyState icon="calendar" title="A clear day" text="Nothing scheduled. Create an event or focus block." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New event</Button>} />
              ) : (
                <div className="cal-day-events">
                  {dayItems.map((e) => <CalEntry key={e.id} e={e} tz={tz} />)}
                </div>
              )}
              <Button variant="primary" icon="plus" onClick={() => setCreating(true)} style={{ marginTop: 12 }}>New event</Button>
            </div>
          )}

          {/* AGENDA — upcoming 14 days, chronological */}
          {data && view === 'agenda' && (
            <div className="cal-agenda" style={{ padding: 'var(--s3) var(--s4)' }}>
              {agendaDays.map((k) => {
                const list = dayEntries(k);
                const holidays = holidaysOn(k);
                return (
                  <div key={k} className="cal-agenda-day">
                    <div className="cal-agenda-head">
                      {fmt.dayKey(k, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {k === todayK && <span style={{ color: 'var(--accent-lavender)', marginLeft: 6 }}>· Today</span>}
                      {holidays.length > 0 && <span className="holiday-dot" style={{ marginLeft: 8, display: 'inline-block', verticalAlign: 'middle' }} />}
                    </div>
                    {holidays.map((h) => <HolidayRow key={h.id} h={h} />)}
                    {list.map((e) => <CalEntry key={e.id} e={e} tz={tz} />)}
                    {list.length === 0 && holidays.length === 0 && <span className="cal-week-empty" style={{ padding: 'var(--s2) 0', display: 'block' }}>Nothing scheduled</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Surface>

        <section className="cal-details" aria-live="polite">
          {view === 'month' && (
            <>
              <div className="caption">{selected === todayK ? 'Today' : 'Selected'}</div>
              <h2 style={{ marginBottom: 12 }}>{fmt.dayKey(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              {selectedHolidays.length > 0 && (
                <div className="holiday-today">
                  {selectedHolidays.map((h) => <HolidayRow key={h.id} h={h} />)}
                </div>
              )}
              {entries.length === 0 ? (
                <EmptyState icon="calendar" title="A clear day" text="Nothing scheduled. Create an event or focus block." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New event</Button>} />
              ) : (
                <div className="list stagger" key={selected}>
                  {entries.map((e) => <CalEntry key={e.id} e={e} tz={tz} />)}
                </div>
              )}
              <Button variant="primary" icon="plus" onClick={() => setCreating(true)} style={{ marginTop: 12 }}>New event</Button>
            </>
          )}
          {view !== 'month' && (
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New event</Button>
          )}
          <UpcomingHolidays from={todayK} onPick={pickDate} />
        </section>
      </div>
      <EntityForm entity="events" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
