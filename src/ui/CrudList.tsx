import { useState } from 'react';
import type { ReactNode } from 'react';
import { ENT } from '../core/entities';
import { useApi } from '../core/store';
import { useAuth } from '../core/auth';
import { fmt } from '../lib/tz';
import { Button, EmptyState, ErrorState, LoadingState, Row, SearchField, Surface, Tabs, Badge } from './primitives';
import { IconTile } from './icons';
import { EntityForm } from './EntityForm';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
interface Tab { value: string; label: string; filters: Record<string, string> }

/** Generic, real list for any entity: server-side search, tabs (filters), pagination, create/edit/archive. */
export function CrudList({ entity, tabs, defaults, filters, sub, trailing, empty, searchable = true, sort, pageSize = 50, toolbar, leading }: {
  entity: string; tabs?: Tab[]; defaults?: Rec; filters?: Record<string, string>; sub?: (r: Rec, tz: string) => ReactNode; trailing?: (r: Rec) => ReactNode;
  empty?: { title: string; text: string }; searchable?: boolean; sort?: string; pageSize?: number; toolbar?: ReactNode; leading?: (r: Rec) => ReactNode;
}) {
  const def = ENT[entity]; const { tz } = useAuth();
  const [tab, setTab] = useState(tabs?.[0]?.value ?? ''); const [q, setQ] = useState(''); const [limit, setLimit] = useState(pageSize);
  const [editing, setEditing] = useState<Rec | null>(null); const [creating, setCreating] = useState(false);
  const qs = new URLSearchParams({ limit: String(limit), ...(sort ? { sort } : {}), ...filters, ...(tabs?.find((t) => t.value === tab)?.filters ?? {}), ...(q ? { q } : {}) });
  const { data, loading, error, reload } = useApi<{ items: Rec[]; total: number }>(`/e/${entity}?${qs}`);
  const items = data?.items ?? [];
  return (
    <div className="crud">
      <div className="toolbar">
        {tabs && <Tabs label={`Filter ${def.plural}`} value={tab} onChange={(v) => { setTab(v); setLimit(pageSize); }} options={tabs.map((t) => ({ value: t.value, label: t.label }))} />}
        {searchable && <SearchField aria-label={`Search ${def.plural.toLowerCase()}`} placeholder={`Search ${def.plural.toLowerCase()}`} value={q} onChange={(e) => { setQ(e.target.value); setLimit(pageSize); }} />}
        {toolbar}
        <Button variant="primary" size="sm" icon="plus" onClick={() => setCreating(true)}>New {def.label.toLowerCase()}</Button>
      </div>
      <Surface pad="none">
        {loading && !data && <div style={{ padding: 12 }}><LoadingState label={`Loading ${def.plural.toLowerCase()}`} /></div>}
        {error && !data && <ErrorState text={error} onRetry={reload} />}
        {data && items.length === 0 && <EmptyState icon={def.icon} title={q ? 'No matches' : empty?.title ?? `No ${def.plural.toLowerCase()} yet`} text={q ? `Nothing matches “${q}”.` : empty?.text ?? `Create your first ${def.label.toLowerCase()}.`} action={!q ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New {def.label.toLowerCase()}</Button> : undefined} />}
        {items.length > 0 && (
          <ul className="list divided stagger">
            {items.map((r) => (
              <li key={r.id}>
                <Row onClick={() => setEditing(r)} leading={leading?.(r) ?? <IconTile name={def.icon} tone={def.tone} size="sm" />} title={def.title(r)}
                  subtitle={sub ? sub(r, tz) : def.sub?.(r) ?? (r.due_at ? fmt.dateTime(r.due_at, tz) : r.status ? String(r.status).replace(/_/g, ' ') : undefined)}
                  trailing={trailing?.(r) ?? (r.status && !['open', 'active'].includes(r.status) ? <Badge>{String(r.status).replace(/_/g, ' ')}</Badge> : undefined)} />
              </li>
            ))}
          </ul>
        )}
      </Surface>
      {data && data.total > items.length && <div style={{ textAlign: 'center', marginTop: 16 }}><Button onClick={() => setLimit((l) => l + pageSize)}>Show more ({data.total - items.length} left)</Button></div>}
      <EntityForm entity={entity} open={creating} onClose={() => setCreating(false)} defaults={defaults} />
      <EntityForm entity={entity} open={!!editing} record={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
