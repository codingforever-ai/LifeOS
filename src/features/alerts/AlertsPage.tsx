import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { Badge, BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface } from '../../ui/primitives';

interface AlertItem { id: string; kind: string; title: string; body: string; priority: string; read_at: string | null; dismissed_at: string | null; ref_type: string | null; ref_id: string | null; created_at: string }

const PRIORITY_ICON: Record<string, string> = { high: 'alert', medium: 'bell', low: 'info' };
const KIND_LABEL: Record<string, string> = {
  deadline: 'Deadline', overdue: 'Overdue', capacity: 'Capacity', conflict: 'Conflict',
  stalled: 'Stalled', inactive_goal: 'Inactive', habit: 'Habit',
};

export default function AlertsPage() {
  const { run } = useCore();
  const { data, loading, error, reload } = useApi<AlertItem[]>('/alerts?all=1');

  const dismiss = (id: string) => run(() => api.post(`/alerts/${id}/dismiss`), 'Dismissed');

  const items = data ?? [];
  // Group by priority
  const high = items.filter((a) => a.priority === 'high' && !a.dismissed_at);
  const medium = items.filter((a) => a.priority === 'medium' && !a.dismissed_at);
  const low = items.filter((a) => a.priority === 'low' && !a.dismissed_at);
  const dismissed = items.filter((a) => a.dismissed_at);

  return (
    <>
      <PageHeader eyebrow="Alerts" title="What needs attention" subtitle="Generated from your actual state — deadlines, overload, stalled projects. Not everything is urgent."
        actions={<Button onClick={() => run(() => api.post('/alerts-read-all'), 'All marked read')}>Mark all read</Button>} />

      {loading && !data && <Surface><LoadingState label="Loading alerts" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}

      {data && high.length === 0 && medium.length === 0 && low.length === 0 && dismissed.length === 0 && (
        <Surface><EmptyState icon="bell" title="No alerts" text="You're all caught up." /></Surface>
      )}

      {data && (
        <>
          {high.length > 0 && (
            <div className="alert-group" data-priority="high">
              <div className="alert-group-head"><BubbleIcon name="alert" tone="plum" size="sm" /><span className="caption">Critical · {high.length}</span></div>
              <Surface pad="none" tone="raised"><ul className="list divided">
                {high.map((a) => <AlertRow key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />)}
              </ul></Surface>
            </div>
          )}
          {medium.length > 0 && (
            <div className="alert-group" data-priority="medium">
              <div className="alert-group-head"><BubbleIcon name="bell" tone="sand" size="sm" /><span className="caption">Upcoming · {medium.length}</span></div>
              <Surface pad="none"><ul className="list divided">
                {medium.map((a) => <AlertRow key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />)}
              </ul></Surface>
            </div>
          )}
          {low.length > 0 && (
            <div className="alert-group" data-priority="low">
              <div className="alert-group-head"><BubbleIcon name="info" tone="graphite" size="sm" /><span className="caption">Heads up · {low.length}</span></div>
              <Surface pad="none"><ul className="list divided">
                {low.map((a) => <AlertRow key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />)}
              </ul></Surface>
            </div>
          )}
          {dismissed.length > 0 && (
            <div className="alert-group" data-priority="dismissed" style={{ opacity: 0.55 }}>
              <div className="alert-group-head"><span className="caption">Dismissed · {dismissed.length}</span></div>
              <Surface pad="none"><ul className="list divided">
                {dismissed.map((a) => <AlertRow key={a.id} alert={a} />)}
              </ul></Surface>
            </div>
          )}
        </>
      )}
    </>
  );
}

function AlertRow({ alert, onDismiss }: { alert: AlertItem; onDismiss?: () => void }) {
  return (
    <li>
      <Row as="div"
        leading={<BubbleIcon name={PRIORITY_ICON[alert.priority] ?? 'bell'} tone={alert.priority === 'high' ? 'plum' : alert.priority === 'medium' ? 'sand' : 'graphite'} size="sm" />}
        title={alert.title}
        subtitle={<span>{KIND_LABEL[alert.kind] ?? alert.kind}{alert.body ? ` · ${alert.body}` : ''}</span>}
        trailing={
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!alert.read_at && <Badge tone="accent">new</Badge>}
            {onDismiss && !alert.dismissed_at && <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>}
          </span>
        }
      />
    </li>
  );
}
