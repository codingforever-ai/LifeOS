import { useState } from 'react';
import { api } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { dayKey } from '../../lib/tz';
import { domainName } from '../../core/domains';
import { Badge, Button, EmptyState, Input, PageHeader, Row, Surface } from '../../ui/primitives';
import { IconTile } from '../../ui/icons';
import { EntityForm } from '../../ui/EntityForm';
import { Async, Stat, StatGrid, label, pctOf } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function HabitsPage() {
  const { run } = useCore(); const { tz } = useAuth(); const q = useApi<Rec[]>('/habits-view');
  const [edit, setEdit] = useState<Rec | null>(null); const [creating, setCreating] = useState(false); const [qty, setQty] = useState<Record<string, string>>({});
  const log = (h: Rec, status: 'done' | 'skipped') => run(() => api.post(`/habits/${h.id}/log`, { status, ...(status === 'done' && h.kind !== 'binary' && qty[h.id] ? { value: Number(qty[h.id]) } : {}) }), status === 'done' ? 'Logged' : 'Skipped');
  const undo = (h: Rec) => run(() => api.del(`/habits/${h.id}/log/${dayKey(new Date(), tz)}`), 'Entry removed');
  return (
    <>
      <PageHeader eyebrow="Habits" title="Consistency, measured" subtitle="Streaks and consistency are computed from your daily entries. Habits only feed a goal when you configure it." actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New habit</Button>} />
      <Async q={q} label="Loading habits">{(items) => {
        const active = items.filter((h) => h.status === 'active'); const list = items.filter((h) => h.status !== 'archived');
        if (!list.length) return <Surface><EmptyState icon="repeat" title="No habits yet" text="Start with one small, repeatable action — daily, weekly or on custom days." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New habit</Button>} /></Surface>;
        const cons = active.filter((h) => h.stats.consistency != null);
        return (<>
          <StatGrid><Stat label="Done today" value={`${active.filter((h) => h.stats.doneToday).length}/${active.length}`} /><Stat label="Best streak" value={Math.max(0, ...active.map((h) => h.stats.streak))} sub="current" /><Stat label="Avg consistency (30d)" value={cons.length ? pctOf(cons.reduce((s, h) => s + h.stats.consistency, 0) / cons.length) : '—'} /></StatGrid>
          <Surface pad="none"><ul className="list divided">{list.map((h) => (
            <li key={h.id}><Row as="div" leading={<IconTile name="repeat" tone="mist" size="sm" />} title={<button type="button" className="link" onClick={() => setEdit(h)}>{h.title}</button>}
              subtitle={<><span>{domainName(h.domain)} · {h.cadence === 'weekly' ? `${h.target_per_week}×/week` : label(h.cadence)}{h.target_value ? ` · target ${h.target_value} ${h.unit ?? ''}` : ''} · streak {h.stats.streak} (best {h.stats.longest}) · consistency {h.stats.consistency == null ? 'n/a' : pctOf(h.stats.consistency)}</span>
                <span className="dots" role="img" aria-label="Last 7 days">{h.stats.last7.map((d: Rec) => <i key={d.day} className="dot" data-s={d.status} title={`${d.day}: ${d.status}`} />)}</span></>}
              trailing={h.status !== 'active' ? <Badge>{label(h.status)}</Badge> : (
                <span className="field-inline">
                  {h.kind !== 'binary' && !h.stats.doneToday && <Input aria-label={`${h.title} amount`} type="number" style={{ width: 80 }} placeholder={h.unit ?? 'amt'} value={qty[h.id] ?? ''} onChange={(e) => setQty((x) => ({ ...x, [h.id]: e.target.value }))} />}
                  {h.stats.doneToday ? <Button size="sm" onClick={() => undo(h)}>Undo</Button> : <><Button size="sm" variant="primary" icon="check" onClick={() => log(h, 'done')}>Done</Button><Button size="sm" variant="ghost" onClick={() => log(h, 'skipped')}>Skip</Button></>}
                </span>)} /></li>))}</ul></Surface>
        </>);
      }}</Async>
      <EntityForm entity="habits" open={creating} onClose={() => setCreating(false)} />
      <EntityForm entity="habits" open={!!edit} record={edit} onClose={() => setEdit(null)} />
    </>
  );
}
