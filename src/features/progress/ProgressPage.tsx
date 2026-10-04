import { useCore } from '../../core/store';
import { goalProgress, pct, projectProgress } from '../../core/progress';
import { demoConsistency, demoWeek } from '../../data/demo';
import { PageHeader, ProgressBar, Section, Surface } from '../../ui/primitives';

function PlannedVsCompleted() {
  const { labels, planned, completed } = demoWeek;
  const max = Math.max(...planned);
  const H = 120;
  return (
    <figure className="chart" aria-label="Planned versus completed tasks over the last 7 days">
      <svg viewBox="0 0 280 150" role="img" aria-hidden="true">
        {labels.map((l, i) => {
          const x = 12 + i * 38;
          const hp = (planned[i] / max) * H;
          const hc = (completed[i] / max) * H;
          return (
            <g key={l + i}>
              <rect x={x} y={H - hp + 6} width={12} height={hp} rx={4} className="bar-plan" />
              <rect x={x + 14} y={H - hc + 6} width={12} height={hc} rx={4} className="bar-done" />
              <text x={x + 13} y={146} textAnchor="middle" className="axis">{l}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="legend"><span><i className="bar-plan-key" />Planned</span><span><i className="bar-done-key" />Completed</span></figcaption>
    </figure>
  );
}

function FocusTrend() {
  const v = demoWeek.focusMin;
  const max = Math.max(...v);
  const pts = v.map((m, i) => [8 + (i * 264) / 6, 8 + (1 - m / max) * 84] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <figure className="chart" aria-label="Focus minutes over the last 7 days">
      <svg viewBox="0 0 280 110" aria-hidden="true">
        <defs><linearGradient id="fx" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".28" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
        <path d={`${line} L272,100 L8,100 Z`} fill="url(#fx)" />
        <path d={line} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 6 ? 4 : 2.5} fill={i === 6 ? '#cdbefc' : '#a78bfa'} />)}
      </svg>
    </figure>
  );
}

export default function ProgressPage() {
  const { goals, projects, tasks } = useCore();
  const done = tasks.filter((t) => t.done).length;
  const focusTotal = demoWeek.focusMin.reduce((a, b) => a + b, 0);
  const planned = demoWeek.planned.reduce((a, b) => a + b, 0);
  const completed = demoWeek.completed.reduce((a, b) => a + b, 0);
  const active = demoConsistency.filter(Boolean).length;

  return (
    <>
      <PageHeader eyebrow="Progress" title="How it’s going" subtitle="Outcomes and trends, without the noise." />
      <div className="stats stagger">
        <div><div className="stat-num num">{Math.round(focusTotal / 6) / 10}<small> h</small></div><div className="muted small">Focus this week</div></div>
        <div><div className="stat-num num">{completed}<small> / {planned}</small></div><div className="muted small">Planned work completed</div></div>
        <div><div className="stat-num num">{active}<small> / 28</small></div><div className="muted small">Days with activity</div></div>
        <div><div className="stat-num num">{done}</div><div className="muted small">Tasks completed (open list)</div></div>
      </div>

      <div className="progress-grid">
        <Section title="Planned vs completed"><Surface><PlannedVsCompleted /></Surface></Section>
        <Section title="Focus time"><Surface><FocusTrend /><p className="muted small">Steadier than last week; strongest on Wednesday.</p></Surface></Section>
      </div>

      <Section title="Consistency · last 4 weeks">
        <Surface>
          <div className="consistency" role="img" aria-label={`Active on ${active} of the last 28 days`}>
            {demoConsistency.map((v, i) => <i key={i} data-on={!!v} />)}
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>You’ve shown up on {pct(active / 28)}% of days. Rest days are part of the pattern.</p>
        </Surface>
      </Section>

      <div className="progress-grid">
        <Section title="Goals">
          <Surface><div className="bars">{goals.map((g) => <div key={g.id}><div className="bars-row"><span>{g.title}</span><span className="num muted">{pct(goalProgress(g, projects))}%</span></div><ProgressBar value={goalProgress(g, projects)} label={g.title} /></div>)}</div></Surface>
        </Section>
        <Section title="Projects">
          <Surface><div className="bars">{projects.map((p) => <div key={p.id}><div className="bars-row"><span>{p.title}</span><span className="num muted">{pct(projectProgress(p))}%</span></div><ProgressBar value={projectProgress(p)} label={p.title} /></div>)}</div></Surface>
        </Section>
      </div>
    </>
  );
}
