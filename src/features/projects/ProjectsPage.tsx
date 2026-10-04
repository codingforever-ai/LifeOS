import { useState } from 'react';
import { useCore } from '../../core/store';
import type { Project } from '../../core/types';
import { domainName } from '../../core/domains';
import { pct, projectProgress } from '../../core/progress';
import { Badge, BubbleIcon, EmptyState, PageHeader, ProgressBar, Row, Surface } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { Icon } from '../../ui/Icon';
import { fmtShort } from '../../lib/date';
import { TaskRow, TaskDetail } from '../tasks/TaskParts';
import type { Task } from '../../core/types';

const STATUS = { active: { label: 'Active', tone: 'ok' }, planning: { label: 'Planning', tone: 'accent' }, paused: { label: 'Paused', tone: undefined } } as const;

export default function ProjectsPage() {
  const { projects, goals, tasks } = useCore();
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
              const v = projectProgress(p);
              const s = STATUS[p.status];
              return (
                <li key={p.id}>
                  <button type="button" className="row project-row" onClick={() => setOpen(p)}>
                    <BubbleIcon name="projects" tone={p.status === 'paused' ? 'graphite' : 'royal'} />
                    <span className="row-main">
                      <span className="row-title">{p.title}</span>
                      <span className="row-sub">{goals.find((g) => g.id === p.goalId)?.title} · {domainName(p.domain)}</span>
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
            <p className="muted">{open.summary}</p>
            <div className="caption">Milestones</div>
            <ol className="milestones">
              {open.milestones.map((m) => (
                <li key={m.id} data-done={m.done}>
                  <span className="m-dot">{m.done && <Icon name="check" />}</span>
                  <span className="row-main"><span className="row-title">{m.title}</span>{m.due && <span className="row-sub">{fmtShort(m.due)}</span>}</span>
                </li>
              ))}
            </ol>
            <div className="caption">Tasks</div>
            <div className="list">
              {tasks.filter((t) => t.projectId === open.id).map((t) => <TaskRow key={t.id} task={t} onOpen={setTask} />)}
              {!tasks.some((t) => t.projectId === open.id) && <Row as="div" title="No tasks linked yet" />}
            </div>
          </div>
        )}
      </Overlay>
      <TaskDetail task={task} onClose={() => setTask(null)} />
    </>
  );
}
