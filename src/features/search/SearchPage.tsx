import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { BubbleIcon, EmptyState, LoadingState, PageHeader, Row, SearchField, Section, Surface, Tabs } from '../../ui/primitives';
import type { IconName } from '../../ui/Icon';

type Cat = 'all' | 'tasks' | 'goals' | 'projects' | 'deadlines' | 'notes' | 'events' | 'decisions' | 'memories';
interface Hit { id: string; type: string; title: string; subtitle?: string }
interface SearchResult { results: Hit[]; total: number }

const CAT_LABEL: Record<string, string> = { tasks: 'Tasks', goals: 'Goals', projects: 'Projects', deadlines: 'Deadlines', notes: 'Notes', events: 'Events', decisions: 'Decisions', memories: 'Memory' };
const CAT_ICON: Record<string, IconName> = { tasks: 'tasks', goals: 'goals', projects: 'projects', deadlines: 'flag', notes: 'note', events: 'calendar', decisions: 'flag', memories: 'brain', exams: 'graduation', subjects: 'book', accomplishments: 'trophy', reviews: 'history', experiments: 'flask', habits: 'repeat' };

export default function SearchPage() {
  const nav = useNavigate();
  const { settings } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Cat>('all');
  useEffect(() => { input.current?.focus(); }, []);

  const types = cat === 'all' ? undefined : cat;
  const { data, loading } = useApi<SearchResult>(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}${types ? `&types=${types}` : ''}` : null);

  const hits = data?.results ?? [];

  return (
    <>
      <PageHeader eyebrow="Search" title="Find anything" />
      <div className="search-bar">
        <SearchField ref={input} placeholder="Search tasks, goals, notes, decisions…" aria-label="Search LifeOS" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }} />
        <Tabs<Cat> label="Search category" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, { value: 'tasks', label: 'Tasks' }, { value: 'goals', label: 'Goals' }, { value: 'projects', label: 'Projects' }, { value: 'deadlines', label: 'Deadlines' }, { value: 'notes', label: 'Notes' }, { value: 'decisions', label: 'Decisions' }]} />
      </div>

      {!q.trim() ? (
        <Section title="Recent searches">
          <div className="chips">{(settings.recentSearches ?? []).map((r: string) => <button key={r} type="button" className="chip" onClick={() => setQ(r)}>{r}</button>)}
          {!settings.recentSearches?.length && <span className="muted small">Your recent searches will appear here.</span>}</div>
        </Section>
      ) : loading ? (
        <div style={{ marginTop: 24 }}><LoadingState rows={3} /></div>
      ) : hits.length === 0 ? (
        <Surface style={{ marginTop: 24 }}><EmptyState icon="search" title={`No results for "${q}"`} text="Try a different word or category." /></Surface>
      ) : (
        <Section title={`${hits.length} ${hits.length === 1 ? 'result' : 'results'}`}>
          <Surface pad="none"><ul className="list divided" aria-live="polite">{hits.slice(0, 30).map((h) => (
            <li key={h.type + h.id}><Row leading={<BubbleIcon name={(CAT_ICON[h.type] ?? 'search') as IconName} tone="graphite" size="sm" />} title={h.title} subtitle={h.subtitle ?? (CAT_LABEL[h.type] ?? h.type)} onClick={() => nav(`/${h.type === 'tasks' ? 'tasks' : h.type === 'goals' ? 'goals' : h.type === 'projects' ? 'projects' : h.type === 'deadlines' ? 'deadlines' : h.type === 'notes' ? 'memory' : h.type === 'decisions' ? 'decisions' : 'search'}`)} /></li>
          ))}</ul></Surface>
        </Section>
      )}
    </>
  );
}
