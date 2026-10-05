import { useState } from 'react';
import { useCore } from '../../core/store';
import type { Goal } from '../../core/types';
import { domainName } from '../../core/domains';
import { goalProgress, pct, projectProgress } from '../../core/progress';
import { Badge, BubbleIcon, EmptyState, PageHeader, ProgressBar, ProgressRing, Row, Surface } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { fmtShort } from '../../lib/date';

export default function GoalsPage() {
  const { goals, projects, tasks, milestones, progress } = useCore();
  const [open, setOpen] = useState<Goal | null>(null);
  const ps = open ? projects.filter((p) => p.goal_id === open.id) : [];
  const upcoming = ps.flatMap((p) => milestones.filter((m) => m.project_id === p.id && !m.done_at).map((m) => ({ ...m, project: p.title }))).sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''));

  return (
    <>
      <PageHeader eyebrow="Goals" title="What you're working toward" subtitle="Progress is derived from the milestones of the projects that serve each goal." />
      {goals.length === 0 ? (
        <Surface><EmptyState icon="goals" title="No goals yet" text="Start with one outcome that matters. Projects and milestones will build progress toward it." /></Surface>
      ) : (
        <div className="goal-list stagger">
          {goals.map((g) => {
            const p = goalProgress(g, projects, progress);
            const n = projects.filter((x) => x.goal_id === g.id).length;
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
              <ProgressRing value={goalProgress(open, projects, progress)} size={72} label="Goal progress">{pct(goalProgress(open, projects, progress))}%</ProgressRing>
              <div><div className="row-title">Derived progress</div><div className="row-sub">From {ps.length} projects and their milestones</div></div>
            </Surface>
            <div className="caption">Projects</div>
            <div className="list">
              {ps.map((p) => <Row as="div" key={p.id} leading={<BubbleIcon name="projects" tone="royal" size="sm" />} title={p.title} subtitle={`${pct(projectProgress(p, progress))}% · ${tasks.filter((t) => t.project_id === p.id && !t.done_at).length} open tasks`} />)}
            </div>
            <div className="caption">Next milestones</div>
            <div className="list">
              {upcoming.slice(0, 4).map((m) => <Row as="div" key={m.id} leading={<BubbleIcon name="flag" tone="plum" size="sm" />} title={m.title} subtitle={`${m.project}${m.due_at ? ` · ${fmtShort(new Date(m.due_at))}` : ''}`} />)}
            </div>
          </div>
        )}
      </Overlay>
    </>
  );
}
