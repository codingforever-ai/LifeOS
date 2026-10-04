import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCore } from '../../core/store';
import { demoCalendar, demoRecentSearches } from '../../data/demo';
import { DOMAINS } from '../../core/domains';
import { BubbleIcon, EmptyState, PageHeader, Row, SearchField, Section, Surface, Tabs } from '../../ui/primitives';
import type { IconName } from '../../ui/Icon';
import { fmtShort } from '../../lib/date';

type Cat = 'all' | 'tasks' | 'goals' | 'projects' | 'events' | 'domains';
interface Hit { id: string; cat: Exclude<Cat, 'all'>; title: string; sub: string; icon: IconName; path: string }

/** Phase 1: simple substring match over local data. Semantic search plugs in behind the same `Hit` shape. */
export default function SearchPage() {
  const { tasks, goals, projects } = useCore();
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Cat>('all');
  useEffect(() => { input.current?.focus(); }, []);

  const all = useMemo<Hit[]>(() => [
    ...tasks.map((t): Hit => ({ id: t.id, cat: 'tasks', title: t.title, sub: 'Task', icon: 'tasks', path: '/tasks' })),
    ...goals.map((g): Hit => ({ id: g.id, cat: 'goals', title: g.title, sub: 'Goal', icon: 'goals', path: '/goals' })),
    ...projects.map((p): Hit => ({ id: p.id, cat: 'projects', title: p.title, sub: 'Project', icon: 'projects', path: '/projects' })),
    ...demoCalendar.map((e): Hit => ({ id: e.id, cat: 'events', title: e.title, sub: `Calendar · ${fmtShort(e.date)}`, icon: 'calendar', path: '/calendar' })),
    ...DOMAINS.map((d): Hit => ({ id: d.id, cat: 'domains', title: d.name, sub: 'Domain', icon: 'domains', path: '/domains' })),
  ], [tasks, goals, projects]);

  const term = q.trim().toLowerCase();
  const hits = term ? all.filter((h) => (cat === 'all' || h.cat === cat) && (h.title.toLowerCase().includes(term))) : [];

  return (
    <>
      <PageHeader eyebrow="Search" title="Find anything" />
      <div className="search-bar">
        <SearchField ref={input} placeholder="Search tasks, goals, events…" aria-label="Search LifeOS" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }} />
        <Tabs<Cat> label="Search category" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, { value: 'tasks', label: 'Tasks' }, { value: 'goals', label: 'Goals' }, { value: 'projects', label: 'Projects' }, { value: 'events', label: 'Events' }, { value: 'domains', label: 'Domains' }]} />
      </div>

      {!term ? (
        <Section title="Recent searches">
          <div className="chips">{demoRecentSearches.map((r) => <button key={r} type="button" className="chip" onClick={() => setQ(r)}>{r}</button>)}</div>
        </Section>
      ) : hits.length === 0 ? (
        <Surface style={{ marginTop: 24 }}><EmptyState icon="search" title={`No results for “${q}”`} text="Try a different word or category. Semantic search will understand meaning in a later phase." /></Surface>
      ) : (
        <Section title={`${hits.length} ${hits.length === 1 ? 'result' : 'results'}`}>
          <Surface pad="none"><ul className="list divided" aria-live="polite">{hits.slice(0, 20).map((h) => <li key={h.cat + h.id}><Row leading={<BubbleIcon name={h.icon} tone="graphite" size="sm" />} title={h.title} subtitle={h.sub} onClick={() => nav(h.path)} /></li>)}</ul></Surface>
        </Section>
      )}
    </>
  );
}
