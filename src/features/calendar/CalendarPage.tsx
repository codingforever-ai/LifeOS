import { useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { allDomains, domainName } from '../../core/domains';
import { dayKey, addDays as addDayKey, monthStartKey, addMonths, parseDay, parts, weekStart, zonedToUtc, fmt } from '../../lib/tz';
import { Badge, BubbleIcon, Button, EmptyState, IconButton, LoadingState, PageHeader, Row, SearchField, Surface, Tabs } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import type { IconName } from '../../ui/Icon';

interface CalItem { source: string; id: string; series_id?: string; title: string; kind: string; domain: string; start: string; end: string | null; allDay: boolean; place?: string; priority?: string; done?: boolean }
type View = 'month' | 'week' | 'day' | 'agenda';
type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const KIND: Record<string, { label: string; tone: 'purple' | 'plum' | 'royal' | 'graphite' | 'slate' | 'mist'; icon: IconName }> = {
  event: { label: 'Event', tone: 'royal', icon: 'calendar' }, deadline: { label: 'Deadline', tone: 'plum', icon: 'clock' }, focus_block: { label: 'Focus', tone: 'purple', icon: 'focus' },
  focus: { label: 'Focus', tone: 'purple', icon: 'focus' }, task: { label: 'Task', tone: 'graphite', icon: 'tasks' }, appointment: { label: 'Appointment', tone: 'slate', icon: 'clock' }, time_block: { label: 'Block', tone: 'mist', icon: 'clock' },
  habit: { label: 'Habit', tone: 'mist', icon: 'repeat' }, milestone: { label: 'Milestone', tone: 'plum', icon: 'flag' },
};
const ENTITY_OF: Record<string, string> = { event: 'events', deadline: 'deadlines', task: 'tasks', milestone: 'milestones' };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const kindOf = (e: CalItem) => KIND[e.source === 'event' ? e.kind : e.source] ?? KIND[e.kind] ?? KIND.event;

export default function CalendarPage() {
  const { tz } = useAuth(); const { run } = useCore();
  const todayK = dayKey(new Date(), tz);
  const [view, setView] = useState<View>('month'); const [cursorK, setCursorK] = useState(todayK); const [selectedK, setSelectedK] = useState(todayK);
  const [domain, setDomain] = useState(''); const [type, setType] = useState(''); const [q, setQ] = useState(''); const [over, setOver] = useState('');
  const [form, setForm] = useState<{ entity: string; record?: Rec | null; defaults?: Rec } | null>(null);

  const monthK = monthStartKey(cursorK);
  const range = view === 'month' ? { from: addDayKey(monthK, -7), to: addMonths(monthK, 1) } : view === 'week' ? { from: weekStart(cursorK), to: addDayKey(weekStart(cursorK), 7) } : view === 'day' ? { from: cursorK, to: addDayKey(cursorK, 1) } : { from: todayK, to: addDayKey(todayK, 31) };
  const { data, loading, error, reload } = useApi<{ items: CalItem[]; conflicts?: unknown[] }>(`/calendar?from=${range.from}&to=${range.to}`);
  const items = useMemo(() => (data?.items ?? []).filter((e) => (!domain || e.domain === domain) && (!type || e.source === type || e.kind === type) && (!q || e.title.toLowerCase().includes(q.toLowerCase()))), [data, domain, type, q]);
  const byDay = useMemo(() => { const m = new Map<string, CalItem[]>(); for (const e of items) { const k = dayKey(new Date(e.start), tz); (m.get(k) ?? m.set(k, []).get(k)!).push(e); } for (const v of m.values()) v.sort((a, b) => a.start.localeCompare(b.start)); return m; }, [items, tz]);

  const step = (n: number) => setCursorK(view === 'month' ? addMonths(monthK, n) : addDayKey(cursorK, view === 'week' ? 7 * n : view === 'day' ? n : 0));
  const goToday = () => { setCursorK(todayK); setSelectedK(todayK); };
  const edit = async (e: CalItem) => { const entity = ENTITY_OF[e.source]; if (!entity) return; const rec = await api.get<Rec>(`/e/${entity}/${e.series_id ?? e.id}`); setForm({ entity, record: rec }); };
  const complete = (e: CalItem) => run(() => api.post(`/e/${ENTITY_OF[e.source]}/${e.series_id ?? e.id}/complete`), 'Completed');
  const shiftTo = (iso: string, target: string) => { const p = parts(new Date(iso), tz); return zonedToUtc({ ...parseDay(target), h: p.h, mi: p.mi }, tz); };
  const drop = async (e: CalItem, target: string) => {
    setOver(''); const entity = ENTITY_OF[e.source]; if (!entity || dayKey(new Date(e.start), tz) === target) return;
    if (e.series_id && e.series_id !== e.id) { void edit(e); return; } // recurring occurrence: edit the series instead
    const start = shiftTo(e.start, target); const patch: Rec = entity === 'events' ? { start_at: start.toISOString(), ...(e.end ? { end_at: new Date(start.getTime() + (new Date(e.end).getTime() - new Date(e.start).getTime())).toISOString() } : {}) } : { due_at: start.toISOString() };
    await run(() => api.patch(`/e/${entity}/${e.id}`, patch), `Moved to ${fmt.dayKey(target, { weekday: 'short', month: 'short', day: 'numeric' })}`); reload();
  };
  const defaultsFor = (entity: string) => { const at = zonedToUtc({ ...parseDay(selectedK), h: 9, mi: 0 }, tz).toISOString(); return entity === 'events' ? { start_at: at, end_at: new Date(new Date(at).getTime() + 3600000).toISOString() } : { due_at: at }; };

  const Chip = ({ e }: { e: CalItem }) => (
    <button type="button" className="cal-chip" data-kind={e.source === 'deadline' ? 'deadline' : e.kind} data-done={!!e.done} draggable={!!ENTITY_OF[e.source]} onDragStart={(ev) => ev.dataTransfer.setData('text/plain', `${e.source}:${e.id}`)} onClick={() => edit(e)} title={`${e.title} — ${kindOf(e).label}`}>
      {e.allDay ? '' : `${fmt.time(e.start, tz)} `}{e.title}
    </button>
  );
  const DayList = ({ k }: { k: string }) => { const list = byDay.get(k) ?? []; return list.length === 0 ? <EmptyState icon="calendar" title="A clear day" text="Nothing scheduled. Add an event, task or deadline." /> : (
    <div className="list stagger" key={k}>{list.map((e) => { const kk = kindOf(e); return (
      <Row as="div" key={`${e.source}${e.id}`} onClick={() => edit(e)} leading={<BubbleIcon name={kk.icon} tone={kk.tone} size="sm" />} title={e.title}
        subtitle={`${e.allDay ? 'All day' : `${fmt.time(e.start, tz)}${e.end ? `–${fmt.time(e.end, tz)}` : ''}`} · ${domainName(e.domain)}${e.place ? ` · ${e.place}` : ''}`}
        trailing={<span className="field-inline">{(e.source === 'task' || e.source === 'deadline') && !e.done && <Button size="sm" onClick={(ev) => { ev.stopPropagation(); complete(e); }}>Done</Button>}<Badge tone={e.source === 'deadline' ? 'danger' : undefined}>{kk.label}</Badge></span>} />); })}</div>); };

  const { y, m } = parseDay(monthK);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDayKey(monthK, i - lead)); const rows = cells.slice(35).every((c) => !c.startsWith(monthK.slice(0, 7))) ? 5 : 6;
  const title = view === 'month' ? new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString([], { month: 'long', year: 'numeric', timeZone: 'UTC' }) : view === 'week' ? `Week of ${fmt.dayKey(weekStart(cursorK), { month: 'short', day: 'numeric' })}` : view === 'day' ? fmt.dayKey(cursorK, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Next 30 days';
  const dropProps = (k: string) => ({ onDragOver: (ev: React.DragEvent) => { ev.preventDefault(); setOver(k); }, onDragLeave: () => setOver(''), onDrop: (ev: React.DragEvent) => { ev.preventDefault(); const [src, id] = ev.dataTransfer.getData('text/plain').split(':'); const it = (data?.items ?? []).find((x) => x.source === src && x.id === id); if (it) void drop(it, k); } });

  return (
    <>
      <PageHeader eyebrow="Calendar" title={title} actions={<div className="cal-nav">
        {view !== 'agenda' && <IconButton icon="chevron-left" label="Previous" onClick={() => step(-1)} />}<Button size="sm" onClick={goToday}>Today</Button>{view !== 'agenda' && <IconButton icon="chevron-right" label="Next" onClick={() => step(1)} />}
      </div>} />
      <div className="toolbar">
        <Tabs<View> label="Calendar view" value={view} onChange={setView} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'day', label: 'Day' }, { value: 'agenda', label: 'Agenda' }]} />
        <SearchField aria-label="Search calendar" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input compact" aria-label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)}><option value="">All domains</option>{allDomains().map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select className="input compact" aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{['event', 'deadline', 'task', 'focus', 'appointment', 'focus_block', 'time_block', 'milestone', 'habit'].map((t) => <option key={t} value={t}>{KIND[t].label}</option>)}</select>
        <Button size="sm" variant="primary" icon="plus" onClick={() => setForm({ entity: 'events', defaults: defaultsFor('events') })}>Event</Button>
        <Button size="sm" icon="plus" onClick={() => setForm({ entity: 'tasks', defaults: defaultsFor('tasks') })}>Task</Button>
        <Button size="sm" icon="plus" onClick={() => setForm({ entity: 'deadlines', defaults: defaultsFor('deadlines') })}>Deadline</Button>
      </div>
      {loading && !data && <LoadingState rows={4} label="Loading calendar" />}
      {error && !data && <p className="muted small" role="alert">{error}</p>}
      {view === 'month' && (
        <div className="cal-layout">
          <Surface pad="none" className="cal-surface"><div className="cal-grid" role="grid" aria-label={title}>
            {WEEKDAYS.map((w) => <div key={w} className="cal-dow" role="columnheader">{w}</div>)}
            {cells.slice(0, rows * 7).map((c) => { const list = byDay.get(c) ?? []; const kinds = Array.from(new Set(list.map((e) => e.kind))).slice(0, 3);
              return (<button key={c} type="button" role="gridcell" className="cal-cell" data-today={c === todayK} data-selected={c === selectedK} data-outside={!c.startsWith(monthK.slice(0, 7))} data-over={over === c} aria-label={`${c}${list.length ? `, ${list.length} items` : ''}`} aria-selected={c === selectedK} onClick={() => { setSelectedK(c); if (!c.startsWith(monthK.slice(0, 7))) setCursorK(c); }} {...dropProps(c)}>
                <span className="cal-num num">{Number(c.slice(8))}</span><span className="cal-dots">{kinds.map((k) => <i key={k} data-kind={k} />)}</span></button>); })}
          </div></Surface>
          <section className="cal-details" aria-live="polite"><div className="caption">{selectedK === todayK ? 'Today' : 'Selected'}</div><h2 style={{ marginBottom: 12 }}>{fmt.dayKey(selectedK, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
            <div className="stack">{(byDay.get(selectedK) ?? []).length > 0 && <p className="faint small">Drag an item onto another day to reschedule it.</p>}
              {(byDay.get(selectedK) ?? []).map((e) => <Chip key={`${e.source}${e.id}`} e={e} />)}{(byDay.get(selectedK) ?? []).length === 0 && <DayList k={selectedK} />}</div></section>
        </div>)}
      {view === 'week' && <div className="week-grid">{Array.from({ length: 7 }, (_, i) => addDayKey(weekStart(cursorK), i)).map((k) => (
        <div key={k} className="week-col" data-today={k === todayK} {...dropProps(k)} style={over === k ? { outline: '2px solid var(--accent)' } : undefined}>
          <button type="button" className="caption link" onClick={() => { setCursorK(k); setSelectedK(k); setView('day'); }}>{fmt.dayKey(k, { weekday: 'short', day: 'numeric' })}</button>
          {(byDay.get(k) ?? []).map((e) => <Chip key={`${e.source}${e.id}`} e={e} />)}</div>))}</div>}
      {view === 'day' && <Surface pad="md" {...dropProps(cursorK)}><DayList k={cursorK} /></Surface>}
      {view === 'agenda' && (items.length === 0 ? <Surface><EmptyState icon="calendar" title="Nothing coming up" text="No events, deadlines or tasks in the next 30 days." /></Surface> : (
        <div className="stack">{[...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k]) => <section key={k}><div className="caption" style={{ marginBottom: 6 }}>{k === todayK ? 'Today · ' : ''}{fmt.dayKey(k, { weekday: 'long', month: 'long', day: 'numeric' })}</div><Surface pad="md"><DayList k={k} /></Surface></section>)}</div>))}
      {form && <EntityForm entity={form.entity} record={form.record} defaults={form.defaults} open onClose={() => { setForm(null); reload(); }} />}
    </>
  );
}
