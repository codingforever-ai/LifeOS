import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { domainName } from '../../core/domains';
import { Badge, BubbleIcon, PageHeader, ProgressBar, Section, Surface, LoadingState, ErrorState } from '../../ui/primitives';
import { fmt, minutesLabel } from '../../lib/tz';

interface CompassData {
  days: number; totalFocusMinutes: number;
  allocation: { domain: string; minutes: number; share: number; calendarMinutes: number }[];
  goals: { id: string; title: string; domain: string; priority: number; focusMinutes: number; share: number; tasksCompleted: number }[];
  neglected: string[];
  plannedVsActual: { domain: string; plannedMin: number; actualMin: number }[];
  topPriorities: { id: string; title: string; domain: string; priority: number; focusMinutes: number; share: number; tasksCompleted: number }[];
}

export default function ProgressPage() {
  const { goals, projects, tasks, progress, status, reload } = useCore();
  const { data, loading, error, reload: reloadCompass } = useApi<CompassData>('/compass?days=14');

  if (status === 'loading') return <div style={{ padding: 24 }}><LoadingState label="Loading progress" /></div>;
  if (status === 'error') return <ErrorState text="Couldn't load progress." onRetry={reload} />;

  const done = tasks.filter((t) => t.done_at).length;
  const focusTotal = data?.totalFocusMinutes ?? 0;

  return (
    <>
      <PageHeader eyebrow="Progress" title="How it's going" subtitle="Outcomes and trends, without the noise." />
      <div className="stats stagger">
        <div><div className="stat-num num">{Math.round(focusTotal / 6) / 10}<small> h</small></div><div className="muted small">Focus (14 days)</div></div>
        <div><div className="stat-num num">{done}</div><div className="muted small">Tasks completed</div></div>
        <div><div className="stat-num num">{goals.filter((g) => g.status === 'active').length}</div><div className="muted small">Active goals</div></div>
        <div><div className="stat-num num">{projects.filter((p) => p.status === 'active').length}</div><div className="muted small">Active projects</div></div>
      </div>

      {loading && <Surface><LoadingState label="Loading analytics" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reloadCompass} /></Surface>}
      {data && (
        <>
          {data.allocation.length > 0 && (
            <Section title="Time allocation · 14 days">
              <Surface>
                {data.allocation.map((a) => (
                  <div key={a.domain} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="small">{domainName(a.domain)}</span>
                      <span className="num small muted">{minutesLabel(a.minutes)}{a.calendarMinutes ? ` + ${minutesLabel(a.calendarMinutes)} cal` : ''}</span>
                    </div>
                    <ProgressBar value={a.share} label={`${domainName(a.domain)} share`} />
                  </div>
                ))}
              </Surface>
            </Section>
          )}

          {data.topPriorities.length > 0 && (
            <Section title="Top priorities">
              <Surface pad="none">
                <ul className="list divided">
                  {data.topPriorities.slice(0, 5).map((g) => (
                    <li key={g.id}><div className="row" style={{ padding: '12px 16px' }}>
                      <BubbleIcon name="goals" tone="royal" size="sm" />
                      <span className="row-main"><span className="row-title">{g.title}</span><span className="row-sub">{minutesLabel(g.focusMinutes)} focus · {g.tasksCompleted} tasks done</span></span>
                    </div></li>
                  ))}
                </ul>
              </Surface>
            </Section>
          )}

          {data.neglected.length > 0 && (
            <Section title="Needs attention">
              <Surface>
                {data.neglected.map((d) => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Badge tone="warn">{domainName(d)}</Badge>
                    <span className="muted small">No focus time in the last {data.days} days</span>
                  </div>
                ))}
              </Surface>
            </Section>
          )}
        </>
      )}

      <Section title="Goals">
        <Surface><div className="bars">{goals.map((g) => {
          const p = progress.goals[g.id]?.progress ?? 0;
          return <div key={g.id}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="small">{g.title}</span><span className="num small">{Math.round(p * 100)}%</span>
          </div><ProgressBar value={p} label={g.title} /></div>;
        })}</div></Surface>
      </Section>

      <Section title="Projects">
        <Surface><div className="bars">{projects.map((p) => {
          const v = progress.projects[p.id]?.progress ?? 0;
          return <div key={p.id}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="small">{p.title}</span><span className="num small">{Math.round(v * 100)}%</span>
          </div><ProgressBar value={v} label={p.title} /></div>;
        })}</div></Surface>
      </Section>
    </>
  );
}
