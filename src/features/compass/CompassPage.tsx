import { useApi, useCore } from '../../core/store';
import { domainName } from '../../core/domains';
import { Badge, BubbleIcon, ErrorState, LoadingState, PageHeader, ProgressBar, Row, Section, Surface } from '../../ui/primitives';
import { minutesLabel } from '../../lib/tz';
import { useMemo } from 'react';

interface CompassData {
  days: number; totalFocusMinutes: number;
  allocation: { domain: string; minutes: number; share: number; calendarMinutes: number }[];
  goals: { id: string; title: string; domain: string; priority: number; focusMinutes: number; share: number; tasksCompleted: number }[];
  neglected: string[];
  plannedVsActual: { domain: string; plannedMin: number; actualMin: number }[];
  topPriorities: { id: string; title: string; domain: string; priority: number; focusMinutes: number; share: number; tasksCompleted: number }[];
}

export default function CompassPage() {
  const { goals, tasks, deadlines, projects } = useCore();
  const { data, loading, error, reload } = useApi<CompassData>('/compass?days=14');

  // Derive "What should happen next?" from real data
  const nextActions = useMemo(() => {
    if (!data) return [];
    const actions: { label: string; detail: string; tone: string }[] = [];
    const overdueDl = deadlines.filter((d) => d.status === 'open' && new Date(d.due_at) < new Date());
    if (overdueDl.length) actions.push({ label: `${overdueDl.length} overdue deadline${overdueDl.length > 1 ? 's' : ''}`, detail: overdueDl[0].title, tone: 'danger' });
    const neglectedGoals = data.goals.filter((g) => g.focusMinutes === 0 && g.tasksCompleted === 0);
    if (neglectedGoals.length) actions.push({ label: `Re-engage "${neglectedGoals[0].title}"`, detail: 'No focus or task completion in the window', tone: 'warn' });
    const topGoal = data.topPriorities[0];
    if (topGoal && topGoal.focusMinutes === 0) actions.push({ label: `Prioritise "${topGoal.title}"`, detail: 'Your #1 goal has no focus time this period', tone: 'warn' });
    if (data.allocation.length >= 2 && data.allocation[0].share > 0.65) actions.push({ label: 'Rebalance attention', detail: `${Math.round(data.allocation[0].share * 100)}% of focus went to one domain`, tone: 'warn' });
    const blockedProjects = projects.filter((p) => p.status === 'blocked');
    if (blockedProjects.length) actions.push({ label: `Unblock "${blockedProjects[0].title}"`, detail: blockedProjects[0].blocked_reason || 'Marked as blocked', tone: 'warn' });
    if (!actions.length && data.totalFocusMinutes > 0) actions.push({ label: 'Keep going', detail: 'Your attention aligns with your priorities.', tone: 'ok' });
    return actions;
  }, [data, deadlines, projects]);

  if (loading && !data) return <div style={{ padding: 24 }}><LoadingState label="Loading compass" /></div>;
  if (error) return <ErrorState text={error} onRetry={reload} />;
  if (!data) return null;

  const activeGoals = goals.filter((g) => ['active', 'at_risk'].includes(g.status));
  const total = Math.max(1, ...data.allocation.map((a) => a.minutes));
  const hasData = data.totalFocusMinutes > 0 || data.allocation.length > 0;

  return (
    <>
      <PageHeader eyebrow="Compass" title="Your direction" subtitle={`Where you are, where you're going, and what needs attention — from the last ${data.days} days.`} />

      {/* Where am I? */}
      <Section title="Where am I">
        <Surface>
          <div className="compass-summary">
            <div className="compass-stat">
              <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{minutesLabel(data.totalFocusMinutes)}</div>
              <div className="muted small">Focus time</div>
            </div>
            <div className="compass-stat">
              <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{activeGoals.length}</div>
              <div className="muted small">Active goals</div>
            </div>
            <div className="compass-stat">
              <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{tasks.filter((t) => t.done_at).length}</div>
              <div className="muted small">Tasks done</div>
            </div>
            <div className="compass-stat">
              <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{data.allocation.length}</div>
              <div className="muted small">Domains active</div>
            </div>
          </div>
          {!hasData && <p className="muted small" style={{ marginTop: 'var(--s4)' }}>Not enough activity yet. Start a focus session or complete tasks to see your direction.</p>}
        </Surface>
      </Section>

      {/* Where am I going? */}
      {activeGoals.length > 0 && (
        <Section title="Where am I going">
          <Surface pad="none"><ul className="list divided">
            {activeGoals.sort((a, b) => a.priority - b.priority).slice(0, 6).map((g) => {
              const goalData = data.goals.find((x) => x.id === g.id);
              return (
                <li key={g.id}><Row as="div"
                  leading={<BubbleIcon name="goals" tone="royal" size="sm" />}
                  title={g.title}
                  subtitle={<span>{domainName(g.domain)} · {goalData ? `${minutesLabel(goalData.focusMinutes)} focused · ${goalData.tasksCompleted} tasks done` : 'no focus data yet'}</span>}
                  trailing={g.priority === 1 ? <Badge tone="accent">top</Badge> : undefined}
                /></li>
              );
            })}
          </ul></Surface>
        </Section>
      )}

      {/* What matters? — allocation */}
      {hasData && (
        <Section title="What matters — where your time goes">
          <Surface pad="none"><ul className="list divided">
            {data.allocation.map((a) => (
              <li key={a.domain}>
                <Row as="div"
                  title={domainName(a.domain)}
                  subtitle={<span className="num">{minutesLabel(a.minutes)} · {Math.round(a.share * 100)}% of focus{a.calendarMinutes ? ` · ${minutesLabel(a.calendarMinutes)} on calendar` : ''}</span>}
                  trailing={<span style={{ minWidth: 120 }}><ProgressBar value={a.minutes / total} label={`${domainName(a.domain)} share`} /></span>}
                />
              </li>
            ))}
            {data.allocation.length === 0 && <li><div className="state"><p className="muted small">No focus sessions recorded yet.</p></div></li>}
          </ul></Surface>
        </Section>
      )}

      {/* What's pulling me away? */}
      {(data.neglected.length > 0 || data.plannedVsActual.some((p) => p.plannedMin > p.actualMin * 1.5)) && (
        <Section title="What's pulling me away">
          <Surface>
            {data.neglected.length > 0 && (
              <div style={{ marginBottom: 'var(--s4)' }}>
                <div className="caption" style={{ marginBottom: 'var(--s2)' }}>Neglected goals</div>
                {data.neglected.map((title) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Badge tone="warn">no focus</Badge>
                    <span className="small">{title}</span>
                  </div>
                ))}
              </div>
            )}
            {data.plannedVsActual.filter((p) => p.plannedMin > p.actualMin * 1.5 && p.plannedMin > 0).map((p) => (
              <div key={p.domain} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Badge>planned {'>'} actual</Badge>
                <span className="small">{domainName(p.domain)}: {minutesLabel(p.plannedMin)} planned, {minutesLabel(p.actualMin)} actual</span>
              </div>
            ))}
          </Surface>
        </Section>
      )}

      {/* What should happen next? */}
      {nextActions.length > 0 && (
        <Section title="What should happen next">
          <Surface pad="none"><ul className="list divided">
            {nextActions.map((a, i) => (
              <li key={i}><Row as="div"
                leading={<BubbleIcon name={a.tone === 'danger' ? 'alert' : a.tone === 'warn' ? 'compass' : 'check'} tone={a.tone === 'danger' ? 'plum' : a.tone === 'warn' ? 'sand' : 'lavender'} size="sm" />}
                title={a.label}
                subtitle={a.detail}
              /></li>
            ))}
          </ul></Surface>
        </Section>
      )}
    </>
  );
}
