import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { Badge, BubbleIcon, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface } from '../../ui/primitives';

interface PatternData { patterns: { id: string; kind: string; title: string; detail: string; evidence: string[]; n: number; confidence: string }[]; needsMoreData: string[]; note: string }

export default function PatternsPage() {
  const { data, loading, error, reload } = useApi<PatternData>('/patterns');

  return (
    <>
      <PageHeader eyebrow="Patterns" title="What the data shows" subtitle="Observed, inferred, and suggested — never invented." />
      {loading && !data && <Surface><LoadingState label="Loading patterns" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && (
        <>
          {data.patterns.length === 0 ? (
            <Surface><EmptyState icon="trend" title="Not enough data yet" text={data.note || 'Patterns appear as you use LifeOS more.'} /></Surface>
          ) : (
            <Surface pad="none"><ul className="list divided">
              {data.patterns.map((p) => (
                <li key={p.id}><Row as="div"
                  leading={<BubbleIcon name="trend" tone={p.confidence === 'high' ? 'purple' : 'graphite'} size="sm" />}
                  title={p.title}
                  subtitle={p.detail}
                  trailing={<Badge tone={p.confidence === 'high' ? 'accent' : undefined}>{p.confidence}</Badge>}
                />
                {p.evidence.length > 0 && <p className="muted small" style={{ padding: '0 16px 12px 48px' }}>Evidence: {p.evidence.join(', ')}</p>}</li>
              ))}
            </ul></Surface>
          )}
          {data.needsMoreData.length > 0 && (
            <Surface style={{ marginTop: 16 }}><p className="muted small">Needs more data: {data.needsMoreData.join(', ')}</p></Surface>
          )}
        </>
      )}
    </>
  );
}
