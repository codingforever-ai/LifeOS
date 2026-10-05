import { useApi, useCore } from '../../core/store';
import { goalProgress, pct, projectProgress } from '../../core/progress';
import { PageHeader, ProgressBar, Section, Surface, LoadingState, ErrorState } from '../../ui/primitives';

interface ProgressData {
  goals: Record<string, { progress: number; tasksTotal?: number; tasksDone?: number; milestonesTotal?: number; milestonesDone?: number; done?: boolean }>;
  projects: Record<string, { progress: number; tasksTotal?: number; tasksDone?: number; done?: boolean }>;
  milestones: Record<string, { progress: number; done?: boolean }>;
  goalList: { id: string; title: string; status: string; domain: string; progress: number; health: { state: string } }[];
  projectList: { id: string; title: string; status: string; domain: string; goal_id: string | null; progress: number; health: { state: string } }[];
  planVsActual: { days: { day: string; planned: number; actual: number; focus: number }[]; summary: { planned: number; actual: number; focus: number; accuracy: number } };
}

export default function ProgressPage() {
  const { goals, projects, tasks, progress } = useCore();
  const { data, loading, error, reload } = useApi<ProgressData>('/progress');

  if (loading && !data) return <div style={{ padding: 32 }}><LoadingState rows={4} /></div>;
  if (error && !data) return <ErrorState text={error} onRetry={reload} />;

  const pva = data?.planVsActual;
  const maxBar = pva ? Math.max(1, ...pva.days.map((d) => Math.max(d.planned, d.actual))) : 1;
  const done = tasks.filter((t) => t.done_at).length;
  const focusTotal = pva?.summary.focus ?? 0;
  const planned = pva?.summary.planned ?? 0;
  const actual = pva?.summary.actual ?? 0;

  return (
    <>
      <PageHeader eyebrow="Progress" title="How it's going" subtitle="Outcomes and trends, derived from your records." />
      <div className="stats stagger">
        <div><div className="stat-num num">{Math.round(focusTotal / 6) / 10}<small> h</small></div><div className="muted small">Focus (14 days)</div></div>
        <div><div className="stat-num num">{actual}<small> / {planned}</small></div><div className="muted small">Tasks done vs planned</div></div>
        <div><div className="stat-num num">{done}</div><div className="muted small">Tasks completed</div></div>
        <div><div className="stat-num num">{goals.length}</div><div className="muted small">Active goals</div></div>
      </div>

      {pva && pva.days.length > 0 && (
        <div className="progress-grid">
          <Section title="Plan vs reality">
            <Surface>
              <figure className="chart" aria-label="Planned versus completed tasks">
                <svg viewBox="0 0 280 150" role="img" aria-hidden="true">
                  {pva.days.map((d, i) => {
                    const x = 12 + i * (264 / Math.max(pva.days.length, 1));
                    const w = 10;
                    const hp = (d.planned / maxBar) * 120;
                    const hc = (d.actual / maxBar) * 120;
                    return (
                      <g key={i}>
                        <rect x={x} y={126 - hp} width={w} height={hp} rx={3} className="bar-plan" />
                        <rect x={x + w + 2} y={126 - hc} width={w} height={hc} rx={3} className="bar-done" />
                      </g>
                    );
                  })}
                </svg>
                <figcaption className="legend"><span><i className="bar-plan-key" />Planned</span><span><i className="bar-done-key" />Completed</span></figcaption>
              </figure>
            </Surface>
          </Section>
          <Section title="Focus time">
            <Surface>
              <figure className="chart" aria-label="Focus minutes">
                <svg viewBox="0 0 280 110" aria-hidden="true">
                  {pva.days.length > 1 && (() => {
                    const maxF = Math.max(1, ...pva.days.map((d) => d.focus));
                    const pts = pva.days.map((d, i) => [8 + (i * 264) / (pva.days.length - 1), 8 + (1 - d.focus / maxF) * 84] as const);
                    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
                    return <>
                      <path d={`${line} L272,100 L8,100 Z`} fill="url(#fx)" />
                      <path d={line} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5} fill={i === pts.length - 1 ? '#cdbefc' : '#a78bfa'} />)}
                    </>;
                  })()}
                  <defs><linearGradient id="fx" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".28" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
                </svg>
              </figure>
            </Surface>
          </Section>
        </div>
      )}

      <div className="progress-grid">
        <Section title="Goals">
          <Surface>
            {goals.length === 0 ? <p className="muted small">No goals yet.</p> : (
              <div className="bars">{goals.map((g) => {
                const p = goalProgress(g, projects, progress);
                return <div key={g.id}><div className="bars-row"><span>{g.title}</span><span className="num muted">{pct(p)}%</span></div><ProgressBar value={p} label={g.title} /></div>;
              })}</div>
            )}
          </Surface>
        </Section>
        <Section title="Projects">
          <Surface>
            {projects.length === 0 ? <p className="muted small">No projects yet.</p> : (
              <div className="bars">{projects.map((p) => {
                const v = projectProgress(p, progress);
                return <div key={p.id}><div className="bars-row"><span>{p.title}</span><span className="num muted">{pct(v)}%</span></div><ProgressBar value={v} label={p.title} /></div>;
              })}</div>
            )}
          </Surface>
        </Section>
      </div>
    </>
  );
}
