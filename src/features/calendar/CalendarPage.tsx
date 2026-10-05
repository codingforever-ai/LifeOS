import { useMemo, useState } from 'react';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { domainName } from '../../core/domains';
import { dayKey, addDays as addDayKey, monthStartKey, addMonths, parseDay } from '../../lib/tz';
import { fmt } from '../../lib/tz';
import { Badge, Button, EmptyState, IconButton, LoadingState, PageHeader, Row, Surface, BubbleIcon } from '../../ui/primitives';

interface CalItem { source: string; id: string; title: string; kind: string; domain: string; start: string; end: string | null; allDay: boolean; place?: string; priority?: string }

const KIND: Record<string, { label: string; tone: 'purple' | 'plum' | 'royal' | 'graphite' | 'slate' | 'mist' }> = {
  event: { label: 'Event', tone: 'royal' },
  deadline: { label: 'Deadline', tone: 'plum' },
  focus_block: { label: 'Focus', tone: 'purple' },
  task: { label: 'Task', tone: 'graphite' },
  appointment: { label: 'Appointment', tone: 'slate' },
  time_block: { label: 'Block', tone: 'mist' },
};
const KIND_ICON: Record<string, string> = { event: 'calendar', deadline: 'flag', focus_block: 'focus', task: 'tasks', appointment: 'clock', time_block: 'clock' };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const { tz } = useAuth();
  const todayK = dayKey(new Date(), tz);
  const [cursorK, setCursorK] = useState(monthStartKey(todayK));
  const [selectedK, setSelectedK] = useState(todayK);

  const fromK = addDayKey(monthStartKey(cursorK), -7);
  const toK = addMonths(cursorK, 1);
  const { data, loading, error } = useApi<{ items: CalItem[]; tz: string }>(`/calendar?from=${fromK}&to=${toK}`);

  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const e of data?.items ?? []) {
      const k = dayKey(new Date(e.start), tz);
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    return m;
  }, [data, tz]);

  const { y, m } = parseDay(cursorK);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDayKey(cursorK.replace(/-\d{2}$/, '-01'), i - lead));
  const lastWeek = cells.slice(35).every((c) => !c.startsWith(cursorK.slice(0, 7)));
  const rows = lastWeek ? 5 : 6;

  const move = (n: number) => setCursorK(addMonths(cursorK, n));
  const goToday = () => { setCursorK(monthStartKey(todayK)); setSelectedK(todayK); };

  const entries = (byDay.get(selectedK) ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));
  const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString([], { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <>
      <PageHeader eyebrow="Calendar" title={monthLabel} actions={
        <div className="cal-nav">
          <IconButton icon="chevron-left" label="Previous month" onClick={() => move(-1)} />
          <Button size="sm" onClick={goToday}>Today</Button>
          <IconButton icon="chevron-right" label="Next month" onClick={() => move(1)} />
        </div>
      } />
      <div className="cal-layout">
        <Surface pad="none" className="cal-surface">
          {loading && !data && <div style={{ padding: 24 }}><LoadingState rows={4} /></div>}
          {error && <p className="muted small" style={{ padding: 16 }}>{error}</p>}
          <div className="cal-grid" role="grid" aria-label={monthLabel}>
            {WEEKDAYS.map((w) => <div key={w} className="cal-dow" role="columnheader">{w}</div>)}
            {cells.slice(0, rows * 7).map((c) => {
              const list = byDay.get(c) ?? [];
              const kinds = Array.from(new Set(list.map((e) => e.kind))).slice(0, 3);
              const dayNum = Number(c.slice(8));
              return (
                <button
                  key={c} type="button" role="gridcell" className="cal-cell"
                  data-today={c === todayK} data-selected={c === selectedK} data-outside={!c.startsWith(cursorK.slice(0, 7))}
                  aria-label={`${c}${list.length ? `, ${list.length} items` : ''}`} aria-selected={c === selectedK}
                  onClick={() => { setSelectedK(c); if (!c.startsWith(cursorK.slice(0, 7))) setCursorK(monthStartKey(c)); }}
                >
                  <span className="cal-num num">{dayNum}</span>
                  <span className="cal-dots">{kinds.map((k) => <i key={k} data-kind={k} />)}</span>
                </button>
              );
            })}
          </div>
        </Surface>

        <section className="cal-details" aria-live="polite">
          <div className="caption">{selectedK === todayK ? 'Today' : 'Selected'}</div>
          <h2 style={{ marginBottom: 12 }}>{fmt.dayKey(selectedK, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          {entries.length === 0 ? (
            <EmptyState icon="calendar" title="A clear day" text="Nothing scheduled. Events, deadlines and focus blocks will appear here." />
          ) : (
            <div className="list stagger" key={selectedK}>
              {entries.map((e) => {
                const k = KIND[e.kind] ?? KIND.event;
                return (
                  <Row
                    as="div" key={e.id}
                    leading={<BubbleIcon name={(KIND_ICON[e.kind] ?? 'calendar') as any} tone={k.tone} size="sm" />}
                    title={e.title}
                    subtitle={`${e.allDay ? 'All day' : fmt.time(e.start, tz)} · ${domainName(e.domain)}${e.place ? ` · ${e.place}` : ''}`}
                    trailing={<Badge tone={e.kind === 'deadline' ? 'danger' : undefined}>{k.label}</Badge>}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
