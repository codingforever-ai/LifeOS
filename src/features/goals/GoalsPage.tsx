import { useState } from 'react';
import { useCore } from '../../core/store';
import type { Goal } from '../../core/types';
import { domainName } from '../../core/domains';
import { goalProgress, pct, projectProgress } from '../../core/progress';
import { Badge, BubbleIcon, EmptyState, PageHeader, ProgressBar, ProgressRing, Row, Surface } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { fmtShort } from '../../lib/date';

export default function GoalsPage() {
  const { goals, projects, tasks } = useCore();
  const [open, setOpen] = useState<Goal | null>(null);
  const ps = open ? projects.filter((p) => p.goalId === open.id) : [];
  const upcoming = ps.flatMap((p) => p.milestones.filter((m) => !m.done).map((m) => ({ ...m, project: p.title }))).sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0));

  return (
    <>
      <PageHeader eyebrow="Goals" title="What you’re working toward" subtitle="Progress is derived from the milestones of the projects that serve each goal." />
      {goals.length === 0 ? (
        <Surface><EmptyState icon="goals" title="No goals yet" text="Start with one outcome that matters. Projects and milestones will build progress toward it." /></Surface>
      ) : (
        <div className="goal-list stagger">
          {goals.map((g) => {
            const p = goalProgress(g, projects);
            const n = projects.filter((x) => x.goalId === g.id).length;
            return (
              <button key={g.id} type="button" className="surface goal-card" onClick={() => setOpen(g)}>
                <div className="goal-top">
                  <Badge tone="accent">{domainName(g.domain)}</Badge>
                  <span className="faint small">{g.horizon}</span>
                </div>
                <h3>{g.title}</h3>
                <p className="muted small">{g.why}</p>
                <div className="goal-foot">
                  <div style={{ flex: 1 }}><ProgressBar value={p} label={`${g.title} progress`} /></div>
                  <span className="num small">{pct(p)}%</span>
                </div>
                <span className="faint small">{n} {n === 1 ? 'project' : 'projects'}</span>
              </button>
            );
          })}
        </div>
      )}

      <Overlay open={!!open} onClose={() => setOpen(null)} title={open?.title ?? 'Goal'} variant="drawer">
        {open && (
          <div className="detail-grid">
            <p className="muted">{open.why}</p>
            <Surface tone="raised" className="detail-ring">
              <ProgressRing value={goalProgress(open, projects)} size={72} label="Goal progress">{pct(goalProgress(open, projects))}%</ProgressRing>
              <div><div className="row-title">Derived progress</div><div className="row-sub">From {ps.length} projects and their milestones</div></div>
            </Surface>
            <div className="caption">Projects</div>
            <div className="list">
              {ps.map((p) => <Row as="div" key={p.id} leading={<BubbleIcon name="projects" tone="royal" size="sm" />} title={p.title} subtitle={`${pct(projectProgress(p))}% · ${tasks.filter((t) => t.projectId === p.id && !t.done).length} open tasks`} />)}
            </div>
            <div className="caption">Next milestones</div>
            <div className="list">
              {upcoming.slice(0, 4).map((m) => <Row as="div" key={m.id} leading={<BubbleIcon name="flag" tone="plum" size="sm" />} title={m.title} subtitle={`${m.project}${m.due ? ` · ${fmtShort(m.due)}` : ''}`} />)}
            </div>
          </div>
        )}
      </Overlay>
    </>
  );
}
