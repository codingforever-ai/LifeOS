import { useApi } from '../../core/store';
import { Badge, BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface } from '../../ui/primitives';
import { fmt } from '../../lib/tz';

interface Integration { provider: string; label: string; permissions: string[]; configured: boolean; status: string; last_sync_at: string | null; error: string | null; note: string }

export default function ConnectPage() {
  const { data, loading, error, reload } = useApi<Integration[]>('/integrations');

  return (
    <>
      <PageHeader eyebrow="Connect" title="External services" subtitle="Integrations plug into LifeOS safely. Nothing is faked." />
      {loading && <Surface><LoadingState label="Loading integrations" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && data.length === 0 && <Surface><EmptyState icon="plug" title="No integrations" text="Integration architecture is ready. Add providers as they become available." /></Surface>}
      {data && data.length > 0 && (
        <Surface pad="none"><ul className="list divided">
          {data.map((i) => (
            <li key={i.provider}><Row as="div"
              leading={<BubbleIcon name="plug" tone={i.configured ? 'purple' : 'graphite'} size="sm" />}
              title={i.label}
              subtitle={i.note}
              trailing={<Badge tone={i.configured ? 'ok' : 'accent'}>{i.status}</Badge>}
            /></li>
          ))}
        </ul></Surface>
      )}
    </>
  );
}
