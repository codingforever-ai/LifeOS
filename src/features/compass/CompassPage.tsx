import { useApi } from '../../core/store';
import { domainName } from '../../core/domains';
import { Badge, ErrorState, LoadingState, PageHeader, ProgressBar, Row, Section, Surface } from '../../ui/primitives';
import { minutesLabel } from '../../lib/tz';

interface CompassData {
  days: number; totalFocusMinutes: number;
  allocation: { domain: string; minutes: number; share: number; calendarMinutes: number }[];
  goals: { id: string; title: string; domain: string; priority: number; focusMinutes: number; share: number; tasksCompleted: number }[];
  neglected: string[];
  plannedVsActual: { domain: string; plannedMin: number; actualMin: number }[];
  topPriorities: { id: string; title: string; domain: string; priority: number; focusMinutes: number; share: number; tasksCompleted: number }[];
}

export default function CompassPage() {
  const { data, loading, error, reload } = useApi<CompassData>('/compass?days=14');

  if (loading && !data) return <div style={{ padding: 24 }}><LoadingState label="Loading compass" /></div>;
  if (error) return <ErrorState text={error} onRetry={reload} />;
  if (!data) return null;

  const total = Math.max(1, ...data.allocation.map((a) => a.minutes));

  return (
    <>
      <PageHeader eyebrow="Compass" title="Where your time actually goes" subtitle={`Focus and calendar time across the last ${data.days} days, measured against what you planned.`} />

      <Surface>
        <div className="caption">Total focus</div>
        <div className="capacity-figure num">{minutesLabel(data.totalFocusMinutes)}</div>
        <p className="muted small">Spread across {data.allocation.length} domain{data.allocation.length === 1 ? '' : 's'}.</p>
      </Surface>

      <Section title="Allocation">
        <Surface pad="none">
          <ul className="list divided">
            {data.allocation.map((a) => (
              <li key={a.domain}>
                <Row as="div" title={domainName(a.domain)}
                  subtitle={<span className="num">{minutesLabel(a.minutes)} · {Math.round(a.share * 100)}% of focus{a.calendarMinutes ? ` · ${minutesLabel(a.calendarMinutes)} on the calendar` : ''}</span>}
                  trailing={<span style={{ minWidth: 120 }}><ProgressBar value={a.minutes / total} label={`${domainName(a.domain)} share`} /></span>} />
              </li>
            ))}
            {data.allocation.length === 0 && <li><div className="state"><p className="muted small">No focus sessions recorded yet.</p></div></li>}
          </ul>
        </Surface>
      </Section>

      <Section title="Goals">
        <Surface pad="none">
          <ul className="list divided">
            {data.goals.map((g) => (
              <li key={g.id}>
                <Row as="div" title={g.title}
                  subtitle={<span className="num">{minutesLabel(g.focusMinutes)} focused · {g.tasksCompleted} task{g.tasksCompleted === 1 ? '' : 's'} completed</span>}
                  trailing={g.priority === 1 ? <Badge tone="accent">Top priority</Badge> : undefined} />
              </li>
            ))}
            {data.goals.length === 0 && <li><div className="state"><p className="muted small">No active goals to steer by yet.</p></div></li>}
          </ul>
        </Surface>
      </Section>

      {data.neglected.length > 0 && (
        <Section title="Neglected">
          <Surface>
            <p className="muted small">{data.neglected.join(' · ')} — no focus time or completed tasks in this window.</p>
          </Surface>
        </Section>
      )}
    </>
  );
}
