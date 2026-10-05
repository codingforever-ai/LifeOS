import { useState } from 'react';
import { useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import type { Project, Task } from '../../core/types';
import { domainName } from '../../core/domains';
import { Badge, BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, ProgressBar, Row, Surface } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { EntityForm } from '../../ui/EntityForm';
import { fmt, relDay } from '../../lib/tz';
import { TaskRow, TaskDetail } from '../tasks/TaskParts';

const STATUS: Record<string, { label: string; tone: 'ok' | 'accent' | 'warn' | undefined }> = {
  active: { label: 'Active', tone: 'ok' }, planning: { label: 'Planning', tone: 'accent' }, paused: { label: 'Paused', tone: undefined },
  blocked: { label: 'Blocked', tone: 'warn' }, completed: { label: 'Completed', tone: 'ok' }, archived: { label: 'Archived', tone: undefined },
};

export default function ProjectsPage() {
  const { projects, goals, milestones, tasks, progress, status, reload } = useCore();
  const { tz } = useAuth();
  const [open, setOpen] = useState<Project | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  if (status === 'loading') return <div style={{ padding: 24 }}><LoadingState label="Loading projects" /></div>;
  if (status === 'error') return <ErrorState text="Couldn't load projects." onRetry={reload} />;

  return (
    <>
      <PageHeader eyebrow="Projects" title="Work in motion" subtitle="Each project serves a goal and moves through milestones."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New project</Button>} />
      {projects.length === 0 ? (
        <Surface><EmptyState icon="projects" title="No projects yet" text="Projects turn a goal into milestones, deadlines and tasks." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New project</Button>} /></Surface>
      ) : (
        <Surface pad="none">
          <ul className="list divided stagger">
            {projects.map((p) => {
              const v = progress.projects[p.id]?.progress ?? 0;
              const s = STATUS[p.status] ?? { label: p.status, tone: undefined };
              return (
                <li key={p.id}>
                  <button type="button" className="row project-row" onClick={() => setOpen(p)}>
                    <BubbleIcon name="projects" tone={p.status === 'paused' ? 'graphite' : 'royal'} />
                    <span className="row-main">
                      <span className="row-title">{p.title}</span>
                      <span className="row-sub">{goals.find((g) => g.id === p.goal_id)?.title ?? 'No goal'} · {domainName(p.domain)}</span>
                      <span className="project-bar"><ProgressBar value={v} label={`${p.title} progress`} /></span>
                    </span>
                    <span className="project-meta"><Badge tone={s.tone}>{s.label}</Badge><span className="num small muted">{Math.round(v * 100)}%</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Surface>
      )}

      <Overlay open={!!open} onClose={() => setOpen(null)} title={open?.title ?? 'Project'} variant="drawer"
        footer={open && <>
          <Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>
          <Button variant="ghost" icon="edit" onClick={() => { const p = open; setOpen(null); setEditing(p); }}>Edit</Button>
        </>}>
        {open && (() => {
          const ms = milestones.filter((m) => m.project_id === open.id);
          const p = progress.projects[open.id]?.progress ?? 0;
          return (
            <div className="detail-grid">
              {open.summary && <p className="muted">{open.summary}</p>}
              {open.blocked_reason && <Badge tone="warn">Blocked: {open.blocked_reason}</Badge>}
              <Surface tone="raised" className="detail-ring">
                <ProgressRing value={p} size={72} label="Project progress">{Math.round(p * 100)}%</ProgressRing>
                <div><div className="row-title">Derived progress</div><div className="row-sub">{ms.length} milestones</div></div>
              </Surface>
              <div className="caption">Milestones</div>
              <ol className="milestones">
                {ms.map((m) => (
                  <li key={m.id} data-done={!!m.done_at}>
                    <span className="m-dot">{m.done_at && <Icon name="check" />}</span>
                    <span className="row-main"><span className="row-title">{m.title}</span>{m.due_at && <span className="row-sub">{relDay(m.due_at, tz)}</span>}</span>
                  </li>
                ))}
                {ms.length === 0 && <li><span className="muted small">No milestones yet</span></li>}
              </ol>
              <div className="caption">Tasks</div>
              <div className="list">
                {tasks.filter((t) => t.project_id === open.id).map((t) => <TaskRow key={t.id} task={t} onOpen={setTask} />)}
                {!tasks.some((t) => t.project_id === open.id) && <Row as="div" title="No tasks linked yet" />}
              </div>
            </div>
          );
        })()}
      </Overlay>
      <TaskDetail task={task} onClose={() => setTask(null)} />
      <EntityForm entity="projects" open={creating} onClose={() => setCreating(false)} />
      {editing && <EntityForm entity="projects" record={editing} open={true} onClose={() => setEditing(null)} />}
    </>
  );
}

import { Icon } from '../../ui/Icon';
