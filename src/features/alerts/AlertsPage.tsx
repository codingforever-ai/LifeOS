import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { Badge, Button, EmptyState, PageHeader, Row, Surface } from '../../ui/primitives';
import { IconTile } from '../../ui/icons';
import { Async, label } from '../common/kit';
import { ENTITY_PATH } from '../common/paths';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function AlertsPage() {
  const { run } = useCore(); const nav = useNavigate(); const q = useApi<Rec[]>('/alerts');
  const act = (id: string, a: string, body: Rec = {}) => run(() => api.post(`/alerts/${id}/${a}`, body), a === 'dismiss' ? 'Dismissed' : a === 'snooze' ? 'Snoozed for a day' : undefined);
  return (
    <>
      <PageHeader eyebrow="Alerts" title="Needs your attention" subtitle="Deadlines, overdue work, conflicts, overload, goal risk and more — each one actionable." actions={<Button onClick={() => run(() => api.post('/alerts-read-all'), 'All marked read')}>Mark all read</Button>} />
      <Async q={q} label="Checking for alerts">{(items) => (
        <Surface pad="none">{items.length === 0 ? <EmptyState icon="bell" title="All clear" text="No deadlines, conflicts or risks need attention right now." /> : (
          <ul className="list divided">{items.map((a) => (
            <li key={a.id}><Row as="div" leading={<IconTile name={a.priority === 'high' ? 'alert' : 'bell'} tone={a.priority === 'high' ? 'plum' : 'slate'} size="sm" />} title={<>{a.title} {!a.read_at && <Badge tone="accent">New</Badge>}</>}
              subtitle={`${label(a.kind)}${a.body ? ` · ${a.body}` : ''}`}
              trailing={<span className="field-inline">{ENTITY_PATH[a.ref_type] && <Button size="sm" variant="primary" onClick={() => { act(a.id, 'read'); nav(ENTITY_PATH[a.ref_type]); }}>Open</Button>}<Button size="sm" onClick={() => act(a.id, 'snooze', { hours: 24 })}>Snooze</Button><Button size="sm" variant="ghost" onClick={() => act(a.id, 'dismiss')}>Dismiss</Button></span>} /></li>))}</ul>)}</Surface>)}</Async>
    </>
  );
}
