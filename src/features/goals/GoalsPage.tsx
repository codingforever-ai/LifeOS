import { useState } from 'react';
import { useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import type { Goal } from '../../core/types';
import { domainName } from '../../core/domains';
import { Badge, BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, ProgressBar, ProgressRing, Row, Surface } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { EntityForm } from '../../ui/EntityForm';
import { fmt, relDay } from '../../lib/tz';

export default function GoalsPage() {
  const { goals, projects, milestones, tasks, progress, status, reload } = useCore();
  const { tz } = useAuth();
  const [open, setOpen] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  if (status === 'loading') return <div style={{ padding: 24 }}><LoadingState label="Loading goals" /></div>;
  if (status === 'error') return <ErrorState text="Couldn't load goals." onRetry={reload} />;

  return (
    <>
      <PageHeader eyebrow="Goals" title="What you're working toward" subtitle="Progress is derived from the milestones of the projects that serve each goal."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New goal</Button>} />
      {goals.length === 0 ? (
        <Surface><EmptyState icon="goals" title="No goals yet" text="Start with one outcome that matters. Projects and milestones will build progress toward it." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New goal</Button>} /></Surface>
      ) : (
        <div className="goal-list stagger">
          {goals.map((g) => {
            const p = progress.goals[g.id]?.progress ?? 0;
            const n = projects.filter((x) => x.goal_id === g.id).length;
            return (
              <button key={g.id} type="button" className="surface goal-card" onClick={() => setOpen(g)}>
                <div className="goal-top">
                  <Badge tone="accent">{domainName(g.domain)}</Badge>
                  <span className="faint small">{g.horizon}</span>
                </div>
                <h3>{g.title}</h3>
                {g.why && <p className="muted small">{g.why}</p>}
                <div className="goal-foot">
                  <div style={{ flex: 1 }}><ProgressBar value={p} label={`${g.title} progress`} /></div>
                  <span className="num small">{Math.round(p * 100)}%</span>
                </div>
                <span className="faint small">{n} {n === 1 ? 'project' : 'projects'}</span>
              </button>
            );
          })}
        </div>
      )}

      <Overlay open={!!open} onClose={() => setOpen(null)} title={open?.title ?? 'Goal'} variant="drawer"
        footer={open && <>
          <Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>
          <Button variant="ghost" icon="edit" onClick={() => { const g = open; setOpen(null); setEditing(g); }}>Edit</Button>
        </>}>
        {open && (() => {
          const ps = projects.filter((p) => p.goal_id === open.id);
          const ms = milestones.filter((m) => m.goal_id === open.id || ps.some((p) => p.id === m.project_id));
          const upcoming = ms.filter((m) => !m.done_at).sort((a, b) => (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999'));
          const p = progress.goals[open.id]?.progress ?? 0;
          return (
            <div className="detail-grid">
              {open.why && <p className="muted">{open.why}</p>}
              <Surface tone="raised" className="detail-ring">
                <ProgressRing value={p} size={72} label="Goal progress">{Math.round(p * 100)}%</ProgressRing>
                <div><div className="row-title">Derived progress</div><div className="row-sub">From {ps.length} projects and their milestones</div></div>
              </Surface>
              <div className="caption">Projects</div>
              <div className="list">
                {ps.map((p) => <Row as="div" key={p.id} leading={<BubbleIcon name="projects" tone="royal" size="sm" />} title={p.title} subtitle={`${Math.round((progress.projects[p.id]?.progress ?? 0) * 100)}% · ${tasks.filter((t) => t.project_id === p.id && !t.done_at).length} open tasks`} />)}
                {ps.length === 0 && <Row as="div" title="No projects linked yet" />}
              </div>
              <div className="caption">Next milestones</div>
              <div className="list">
                {upcoming.slice(0, 4).map((m) => <Row as="div" key={m.id} leading={<BubbleIcon name="flag" tone="plum" size="sm" />} title={m.title} subtitle={m.due_at ? relDay(m.due_at, tz) : ''} />)}
                {upcoming.length === 0 && <Row as="div" title="No upcoming milestones" />}
              </div>
            </div>
          );
        })()}
      </Overlay>
      <EntityForm entity="goals" open={creating} onClose={() => setCreating(false)} />
      {editing && <EntityForm entity="goals" record={editing} open={true} onClose={() => setEditing(null)} />}
    </>
  );
}
