import { useApi } from '../../core/store';
import { domainName } from '../../core/domains';
import { Badge, ErrorState, LoadingState, PageHeader, ProgressBar, Row, Section, Surface } from '../../ui/primitives';

interface CapDay { day: string; workDay: boolean; available: number; committed: number; planned: number; buffer: number; remaining: number; overload: boolean; tasks: number }
interface CapData {
  from: string; days: CapDay[];
  totals: { available: number; committed: number; planned: number; buffer: number; remaining: number };
  byDomain: Record<string, { committed: number; planned: number }>;
  unscheduledMin: number; unscheduledCount: number; overloadedDays: string[];
  settings: { workStart: string; workEnd: string; bufferMin: number };
}

const hrs = (min: number) => `${Math.round((min / 60) * 10) / 10} h`;

export default function CapacityPage() {
  const { data, loading, error, reload } = useApi<CapData>('/capacity?days=7');

  if (loading && !data) return <div style={{ padding: 24 }}><LoadingState label="Loading capacity" /></div>;
  if (error) return <ErrorState text={error} onRetry={reload} />;
  if (!data) return null;

  const t = data.totals;
  const used = t.committed + t.planned;
  const load = t.available > 0 ? Math.min(1, used / t.available) : 0;
  const domains = Object.entries(data.byDomain).sort((a, b) => b[1].planned + b[1].committed - (a[1].planned + a[1].committed));

  return (
    <>
      <PageHeader eyebrow="Capacity" title="How much room you have" subtitle={`Work hours ${data.settings.workStart}–${data.settings.workEnd} with a ${data.settings.bufferMin} min buffer.`} />
      <Surface>
        <div className="caption">This week</div>
        <div className="capacity-figure num">{hrs(used)}<span className="muted"> / {hrs(t.available)}</span></div>
        <ProgressBar value={load} label="Capacity used" />
        <p className="muted small" style={{ marginTop: 10 }}>
          {data.overloadedDays.length ? `${data.overloadedDays.length} day${data.overloadedDays.length === 1 ? '' : 's'} overloaded — consider moving something.` : 'Plenty of room this week.'}
        </p>
      </Surface>

      <Section title="By day">
        <Surface pad="none">
          <ul className="list divided">
            {data.days.map((d) => (
              <li key={d.day}>
                <Row as="div" title={<span className="num">{d.day}{d.workDay ? '' : ' · non-working'}</span>}
                  subtitle={<span className="num">{hrs(d.committed + d.planned)} of {hrs(d.available)} committed · {hrs(d.remaining)} free · {d.tasks} task{d.tasks === 1 ? '' : 's'}</span>}
                  trailing={d.overload ? <Badge tone="warn">Overloaded</Badge> : undefined} />
              </li>
            ))}
          </ul>
        </Surface>
      </Section>

      {data.unscheduledCount > 0 && (
        <Section title="Unscheduled">
          <Surface>
            <p className="muted small">{data.unscheduledCount} task{data.unscheduledCount === 1 ? '' : 's'} with no due date — {hrs(data.unscheduledMin)} of estimated work waiting to be placed.</p>
          </Surface>
        </Section>
      )}

      {domains.length > 0 && (
        <Section title="By domain">
          <Surface pad="none">
            <ul className="list divided">
              {domains.map(([id, v]) => (
                <li key={id}>
                  <Row as="div" title={domainName(id)} subtitle={<span className="num">{hrs(v.committed)} committed · {hrs(v.planned)} planned</span>} />
                </li>
              ))}
            </ul>
          </Surface>
        </Section>
      )}
    </>
  );
}
