import { api } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { fmt } from '../../lib/tz';
import { Alert, Badge, Button, PageHeader, Row, Surface } from '../../ui/primitives';
import { IconTile } from '../../ui/icons';
import { Async, label } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function ConnectPage() {
  const { run } = useCore(); const { tz } = useAuth(); const q = useApi<Rec[]>('/integrations');
  return (
    <>
      <PageHeader eyebrow="Connect" title="Integrations" subtitle="Only real, supported connections are listed. Nothing is faked: if a provider can’t connect, you’ll see exactly why." />
      <Alert icon="info">No external integration is connected yet. LifeOS works fully on its own; these are the foundations for syncing later.</Alert>
      <div style={{ height: 16 }} />
      <Async q={q} label="Loading integrations">{(items) => (
        <Surface pad="none"><ul className="list divided">{items.map((i) => (
          <li key={i.provider}><Row as="div" leading={<IconTile name="plug" tone="slate" size="sm" />} title={<>{i.label} <Badge tone={i.status === 'connected' ? 'ok' : undefined}>{label(i.status)}</Badge></>}
            subtitle={<><span>Permissions: {i.permissions.join(', ')}. Sync: {i.last_sync_at ? fmt.dateTime(i.last_sync_at, tz) : 'never'}.</span><span className="faint small">{i.error ?? i.note}</span></>}
            trailing={i.status === 'connected' ? <Button size="sm" onClick={() => run(() => api.post(`/integrations/${i.provider}/disconnect`), 'Disconnected')}>Disconnect</Button> : <Button size="sm" onClick={() => run(() => api.post(`/integrations/${i.provider}/connect`), 'Connected')}>Connect</Button>} /></li>))}</ul></Surface>)}</Async>
    </>
  );
}
