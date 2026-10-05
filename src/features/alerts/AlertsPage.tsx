import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { Badge, BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface } from '../../ui/primitives';

interface AlertItem { id: string; kind: string; title: string; body: string; priority: string; read_at: string | null; dismissed_at: string | null; ref_type: string | null; ref_id: string | null }

export default function AlertsPage() {
  const { run } = useCore();
  const { data, loading, error, reload } = useApi<{ items: AlertItem[]; total: number }>('/alerts?all=1');

  const dismiss = (id: string) => run(() => api.post(`/alerts/${id}/dismiss`), 'Dismissed');

  return (
    <>
      <PageHeader eyebrow="Alerts" title="What needs attention" subtitle="Generated from your actual state — deadlines, overload, stalled projects."
        actions={<Button onClick={() => run(() => api.post('/alerts-read-all'), 'All marked read')}>Mark all read</Button>} />
      {loading && !data && <Surface><LoadingState label="Loading alerts" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && data.items.length === 0 && <Surface><EmptyState icon="bell" title="No alerts" text="You're all caught up." /></Surface>}
      {data && data.items.length > 0 && (
        <Surface pad="none"><ul className="list divided">
          {data.items.map((a) => (
            <li key={a.id}>
              <Row as="div"
                leading={<BubbleIcon name={a.priority === 'high' ? 'alert' : 'bell'} tone={a.priority === 'high' ? 'plum' : 'graphite'} size="sm" />}
                title={a.title}
                subtitle={a.body}
                trailing={
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!a.read_at && <Badge tone="accent">new</Badge>}
                    {!a.dismissed_at && <Button size="sm" variant="ghost" onClick={() => dismiss(a.id)}>Dismiss</Button>}
                  </span>
                }
              />
            </li>
          ))}
        </ul></Surface>
      )}
    </>
  );
}
