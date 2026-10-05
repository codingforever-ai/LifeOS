import { useState } from 'react';
import { useCore } from '../../core/store';
import type { Project, Task } from '../../core/types';
import { domainName } from '../../core/domains';
import { pct, projectProgress } from '../../core/progress';
import { Badge, BubbleIcon, EmptyState, PageHeader, ProgressBar, Row, Surface } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { Icon } from '../../ui/Icon';
import { fmtShort } from '../../lib/date';
import { TaskRow, TaskDetail } from '../tasks/TaskParts';

const STATUS: Record<string, { label: string; tone: 'ok' | 'accent' | undefined }> = { active: { label: 'Active', tone: 'ok' }, planning: { label: 'Planning', tone: 'accent' }, paused: { label: 'Paused', tone: undefined }, blocked: { label: 'Blocked', tone: 'accent' }, completed: { label: 'Completed', tone: 'ok' }, archived: { label: 'Archived', tone: undefined } };

export default function ProjectsPage() {
  const { projects, goals, tasks, milestones, progress } = useCore();
  const [open, setOpen] = useState<Project | null>(null);
  const [task, setTask] = useState<Task | null>(null);

  return (
    <>
      <PageHeader eyebrow="Projects" title="Work in motion" subtitle="Each project serves a goal and moves through milestones." />
      {projects.length === 0 ? (
        <Surface><EmptyState icon="projects" title="No projects yet" text="Projects turn a goal into milestones, deadlines and tasks." /></Surface>
      ) : (
        <Surface pad="none">
          <ul className="list divided stagger">
            {projects.map((p) => {
              const v = projectProgress(p, progress);
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
                    <span className="project-meta"><Badge tone={s.tone}>{s.label}</Badge><span className="num small muted">{pct(v)}%</span></span>
                    <Icon name="chevron-right" className="chev" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Surface>
      )}

      <Overlay open={!!open} onClose={() => setOpen(null)} title={open?.title ?? 'Project'} variant="drawer">
        {open && (
          <div className="detail-grid">
            {open.summary && <p className="muted">{open.summary}</p>}
            <div className="caption">Milestones</div>
            <ol className="milestones">
              {milestones.filter((m) => m.project_id === open.id).map((m) => (
                <li key={m.id} data-done={!!m.done_at}>
                  <span className="m-dot">{m.done_at && <Icon name="check" />}</span>
                  <span className="row-main"><span className="row-title">{m.title}</span>{m.due_at && <span className="row-sub">{fmtShort(new Date(m.due_at))}</span>}</span>
                </li>
              ))}
              {milestones.filter((m) => m.project_id === open.id).length === 0 && <li><span className="muted small">No milestones yet.</span></li>}
            </ol>
            <div className="caption">Tasks</div>
            <div className="list">
              {tasks.filter((t) => t.project_id === open.id).map((t) => <TaskRow key={t.id} task={t} onOpen={setTask} />)}
              {!tasks.some((t) => t.project_id === open.id) && <Row as="div" title="No tasks linked yet" />}
            </div>
          </div>
        )}
      </Overlay>
      <TaskDetail task={task} onClose={() => setTask(null)} />
    </>
  );
}
