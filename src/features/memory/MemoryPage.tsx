import { useMemo, useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { Badge, BubbleIcon, Button, EmptyState, ErrorState, LoadingState, PageHeader, Row, SearchField, Section, Surface, Tabs } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { fmt } from '../../lib/tz';

interface Memory {
  id: string; content: string; category: string; source: string; confidence: number; pinned: boolean;
  created_at: string; updated_at: string;
}
interface MemoryData { items: Memory[]; total: number }

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'fact', label: 'Facts' },
  { value: 'preference', label: 'Preferences' },
  { value: 'rule', label: 'Rules' },
  { value: 'lesson', label: 'Lessons' },
  { value: 'context', label: 'Context' },
  { value: 'note', label: 'Notes' },
];

const CATEGORY_TONE: Record<string, string> = {
  fact: 'royal', preference: 'purple', rule: 'plum', lesson: 'lavender', context: 'slate', note: 'graphite',
};

const SOURCE_LABEL: Record<string, string> = {
  user: 'You', agent: 'AURA', review: 'Review',
};

export default function MemoryPage() {
  const { run } = useCore();
  const { tz } = useAuth();
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Memory | null>(null);

  const qs = new URLSearchParams({ limit: '200', sort: 'updated_at:desc', ...(category !== 'all' ? { category } : {}), ...(q ? { q } : {}) });
  const { data, loading, error, reload } = useApi<MemoryData>(`/e/memories?${qs}`);

  const memories = data?.items ?? [];
  const pinned = memories.filter((m) => m.pinned);
  const unpinned = memories.filter((m) => !m.pinned);

  const related = useMemo(() => {
    if (!selected) return [];
    const words = new Set(selected.content.toLowerCase().split(/\s+/).filter((w) => w.length > 4));
    return memories
      .filter((m) => m.id !== selected.id)
      .map((m) => {
        const sameCat = m.category === selected.category ? 2 : 0;
        const shared = m.content.toLowerCase().split(/\s+/).filter((w) => words.has(w)).length;
        return { m, score: sameCat + shared };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.m);
  }, [selected, memories]);

  const togglePin = (m: Memory) => run(() => api.patch(`/e/memories/${m.id}`, { pinned: !m.pinned }), m.pinned ? 'Unpinned' : 'Pinned');

  return (
    <>
      <PageHeader eyebrow="Memory" title="What LifeOS remembers" subtitle="Explicit, controllable, user-scoped. Not a notes page — a structured recall layer."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Remember</Button>} />

      <div className="toolbar">
        <Tabs label="Memory categories" value={category} onChange={(v) => setCategory(v)} options={CATEGORIES} />
        <SearchField aria-label="Search memories" placeholder="Search memories…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading && !data && <Surface><LoadingState label="Loading memories" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && memories.length === 0 && (
        <Surface><EmptyState icon="brain" title={q ? 'No matches' : 'No memories yet'} text={q ? `Nothing matches "${q}".` : 'Tell LifeOS to remember something — a fact, preference, rule, or lesson.'} action={!q ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Remember</Button> : undefined} /></Surface>
      )}

      {data && memories.length > 0 && (
        <>
          {pinned.length > 0 && (
            <Section title="Pinned">
              <Surface pad="none"><ul className="list divided">
                {pinned.map((m) => (
                  <li key={m.id}>
                    <Row as="div"
                      leading={<BubbleIcon name="brain" tone={CATEGORY_TONE[m.category] ?? 'graphite'} size="sm" />}
                      title={m.content}
                      subtitle={`${m.category} · ${SOURCE_LABEL[m.source] ?? m.source} · ${fmt.date(m.updated_at, tz)}`}
                      trailing={
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge tone="accent">pinned</Badge>
                          <Button size="sm" variant="ghost" onClick={() => setSelected(m)}>View</Button>
                          <Button size="sm" variant="ghost" onClick={() => togglePin(m)}>Unpin</Button>
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul></Surface>
            </Section>
          )}

          {unpinned.length > 0 && (
            <Section title="All memories">
              <Surface pad="none"><ul className="list divided">
                {unpinned.map((m) => (
                  <li key={m.id}>
                    <Row as="div"
                      leading={<BubbleIcon name="brain" tone={CATEGORY_TONE[m.category] ?? 'graphite'} size="sm" />}
                      title={m.content}
                      subtitle={`${m.category} · ${SOURCE_LABEL[m.source] ?? m.source} · confidence ${m.confidence}%`}
                      trailing={
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Button size="sm" variant="ghost" onClick={() => setSelected(m)}>View</Button>
                          <Button size="sm" variant="ghost" onClick={() => togglePin(m)}>Pin</Button>
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul></Surface>
            </Section>
          )}
        </>
      )}

      <EntityForm entity="memories" open={creating} onClose={() => setCreating(false)} />

      {selected && (
        <div className="overlay-backdrop" onClick={() => setSelected(null)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BubbleIcon name="brain" tone={CATEGORY_TONE[selected.category] ?? 'graphite'} size="sm" />
                <span className="caption">{selected.category}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </div>
            <div style={{ padding: '0 var(--s6) var(--s6)' }}>
              <p style={{ fontSize: 'var(--fs-body)', lineHeight: 1.6, marginBottom: 'var(--s4)' }}>{selected.content}</p>
              <div className="facts">
                <dt>Source</dt><dd>{SOURCE_LABEL[selected.source] ?? selected.source}</dd>
                <dt>Confidence</dt><dd>{selected.confidence}%</dd>
                <dt>Created</dt><dd>{fmt.dateTime(selected.created_at, tz)}</dd>
                <dt>Updated</dt><dd>{fmt.dateTime(selected.updated_at, tz)}</dd>
                {selected.pinned && <><dt>Status</dt><dd>Pinned</dd></>}
              </div>
              <div style={{ marginTop: 'var(--s5)' }}>
                <Button size="sm" variant="ghost" onClick={() => { togglePin(selected); setSelected(null); }}>{selected.pinned ? 'Unpin' : 'Pin'}</Button>
              </div>
              {related.length > 0 && (
                <div style={{ marginTop: 'var(--s6)' }}>
                  <div className="caption" style={{ marginBottom: 'var(--s3)' }}>Related memories</div>
                  <Surface pad="none"><ul className="list divided">
                    {related.map((m) => (
                      <li key={m.id}><Row as="div"
                        leading={<BubbleIcon name="brain" tone={CATEGORY_TONE[m.category] ?? 'graphite'} size="sm" />}
                        title={m.content}
                        subtitle={`${m.category} · ${fmt.date(m.updated_at, tz)}`}
                      /></li>
                    ))}
                  </ul></Surface>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
