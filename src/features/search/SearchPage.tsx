import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { BubbleIcon, EmptyState, PageHeader, Row, SearchField, Section, Surface, LoadingState, ErrorState, Badge } from '../../ui/primitives';
import { fmt } from '../../lib/tz';

interface SearchGroup { entity: string; label: string; area: string; total: number; items: { id: string; entity: string; title: string; sub: string; domain: string; updated_at: string; score: number }[] }
interface SearchResult { q: string; groups: SearchGroup[]; total: number; semantic: boolean }

const ENTITY_PATH: Record<string, string> = { tasks: '/tasks', goals: '/goals', projects: '/projects', events: '/calendar', deadlines: '/deadlines', notes: '/notes', habits: '/habits', memories: '/memory', decisions: '/decisions', experiments: '/experiments', accomplishments: '/accomplishments' };

export default function SearchPage() {
  const { settings, saveSettings } = useAuth();
  const { bump } = useCore();
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const { data, loading, error } = useApi<SearchResult>(debounced ? `/search?q=${encodeURIComponent(debounced)}` : null);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);

  const recent = settings.recentSearches ?? [];

  return (
    <>
      <PageHeader eyebrow="Search" title="Find anything" />
      <div className="search-bar">
        <SearchField ref={input} placeholder="Search tasks, goals, events…" aria-label="Search LifeOS" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }} />
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
              <Surface pad="none"><ul className="list divided">
                {g.items.slice(0, 8).map((item) => (
                  <li key={item.id}><Row
                    leading={<BubbleIcon name="search" tone="graphite" size="sm" />}
                    title={item.title}
                    subtitle={item.sub ? `${item.sub} · ${fmt.date(item.updated_at, settings.timezone)}` : fmt.date(item.updated_at, settings.timezone)}
                    onClick={() => { const p = ENTITY_PATH[item.entity]; if (p) nav(p); }}
                  /></li>
                ))}
              </ul></Surface>
            </Section>
          ))}
        </>
      ) : (
        <Surface><EmptyState icon="search" title={`No results for "${q}"`} text="Try a different word or phrase." /></Surface>
      )}
    </>
  );
}
