import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { BubbleIcon, EmptyState, PageHeader, Row, SearchField, Section, Surface, LoadingState, ErrorState, Tabs } from '../../ui/primitives';
import { fmt } from '../../lib/tz';

interface SearchGroup { entity: string; label: string; area: string; total: number; items: { id: string; entity: string; title: string; sub: string; domain: string; updated_at: string; score: number }[] }
interface SearchResult { q: string; groups: SearchGroup[]; total: number; semantic: boolean }

const ENTITY_PATH: Record<string, string> = { tasks: '/tasks', goals: '/goals', projects: '/projects', events: '/calendar', deadlines: '/deadlines', notes: '/notes', habits: '/habits', memories: '/memory', decisions: '/decisions', experiments: '/experiments', accomplishments: '/accomplishments', milestones: '/milestones', exams: '/calendar', assignments: '/calendar', subjects: '/domains', topics: '/domains', study_resources: '/domains', clients: '/domains', deliverables: '/projects', programs: '/domains', finance_items: '/domains', personal_items: '/domains', inbox: '/capture' };
const ENTITY_ICON: Record<string, string> = { tasks: 'tasks', goals: 'goals', projects: 'projects', events: 'calendar', deadlines: 'flag', notes: 'note', habits: 'repeat', memories: 'brain', decisions: 'compass', experiments: 'flask', accomplishments: 'trophy', milestones: 'flag', exams: 'graduation', assignments: 'doc', subjects: 'book', topics: 'target', study_resources: 'note', clients: 'building', deliverables: 'flag', programs: 'dumbbell', finance_items: 'wallet', personal_items: 'home', inbox: 'inbox' };

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'core', label: 'Core', types: 'tasks,goals,projects,milestones,deadlines,events,habits,notes' },
  { value: 'study', label: 'Study', types: 'subjects,topics,exams,assignments,study_resources' },
  { value: 'remember', label: 'Remember', types: 'memories,decisions,accomplishments,reviews' },
  { value: 'life', label: 'Life', types: 'clients,deliverables,programs,finance_items,personal_items' },
];

export default function SearchPage() {
  const { settings } = useAuth();
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);

  const types = FILTERS.find((f) => f.value === filter)?.types;
  const { data, loading, error } = useApi<SearchResult>(debounced ? `/search?q=${encodeURIComponent(debounced)}${types ? `&types=${types}` : ''}` : null);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    if (!data) return [];
    return data.groups.flatMap((g) => g.items.slice(0, 5).map((item) => ({ ...item, groupLabel: g.label })));
  }, [data]);

  useEffect(() => { setActiveIndex(0); }, [debounced, filter]);

  const navigate = (item: { entity: string } | undefined) => {
    if (!item) return;
    const p = ENTITY_PATH[item.entity];
    if (p) nav(p);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setQ(''); input.current?.focus(); return; }
    if (!flatResults.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); navigate(flatResults[activeIndex]); }
  };

  const recent = settings.recentSearches ?? [];
  let runningIndex = 0;

  return (
    <>
      <PageHeader eyebrow="Search" title="Find anything" subtitle="Search across all of LifeOS — tasks, goals, notes, memories, decisions, and more." />

      <div className="search-bar">
        <SearchField ref={input} placeholder="Search tasks, goals, events, memories…" aria-label="Search LifeOS" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} />
        <Tabs label="Search scope" value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      {!debounced ? (
        recent.length > 0 && (
          <Section title="Recent searches">
            <div className="chips">{recent.map((r) => <button key={r} type="button" className="chip" onClick={() => setQ(r)}>{r}</button>)}</div>
          </Section>
        )
      ) : loading ? (
        <Surface><LoadingState label="Searching" /></Surface>
      ) : error ? (
        <Surface><ErrorState text={error} /></Surface>
      ) : data && data.total > 0 ? (
        <>
          {data.groups.map((g) => g.items.length > 0 && (
            <Section key={g.entity} title={`${g.label} (${g.total})`}>
              <Surface pad="none"><ul className="list divided search-results">
                {g.items.slice(0, 5).map((item) => {
                  const idx = runningIndex++;
                  const isActive = idx === activeIndex;
                  return (
                    <li key={item.id} className="search-result" ref={isActive ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}>
                      <Row
                        leading={<BubbleIcon name={(ENTITY_ICON[item.entity] ?? 'search') as any} tone="graphite" size="sm" />}
                        title={item.title}
                        subtitle={item.sub ? `${item.sub} · ${fmt.date(item.updated_at, settings.timezone)}` : fmt.date(item.updated_at, settings.timezone)}
                        onClick={() => navigate(item)}
                      />
                    </li>
                  );
                })}
              </ul></Surface>
            </Section>
          ))}
          <p className="muted small" style={{ textAlign: 'center', marginTop: 'var(--s4)' }}>
            {flatResults.length} results · <kbd className="search-kbd">↑</kbd> <kbd className="search-kbd">↓</kbd> to navigate · <kbd className="search-kbd">Enter</kbd> to open · <kbd className="search-kbd">Esc</kbd> to clear
          </p>
        </>
      ) : (
        <Surface><EmptyState icon="search" title={`No results for "${q}"`} text="Try a different word or phrase, or change the search scope." /></Surface>
      )}
    </>
  );
}
