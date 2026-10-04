import type { Task } from '../../core/types';
import { domainName } from '../../core/domains';
import { useCore } from '../../core/store';
import { Badge, Button, Checkbox } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { diffDays, relativeDay } from '../../lib/date';

export function dueTone(t: Task): 'danger' | 'accent' | undefined {
  if (!t.due || t.done) return undefined;
  const n = diffDays(t.due, new Date());
  return n < 0 ? 'danger' : n === 0 ? 'accent' : undefined;
}

/** Shared task row — used by Today, Tasks, Goals, Projects. */
export function TaskRow({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { toggleTask } = useCore();
  const tone = dueTone(task);
  return (
    <div className="row task-row" data-done={task.done}>
      <Checkbox checked={task.done} onChange={() => toggleTask(task.id)} label={`Mark “${task.title}” ${task.done ? 'incomplete' : 'complete'}`} />
      <button type="button" className="row-main task-main" onClick={() => onOpen(task)}>
        <span className="row-title task-title">{task.title}</span>
        <span className="row-sub">{domainName(task.domain)}{task.estimateMin ? ` · ${task.estimateMin} min` : ''}</span>
      </button>
      {task.due && <Badge tone={tone}>{relativeDay(task.due)}</Badge>}
    </div>
  );
}

export function TaskDetail({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { tasks, goals, projects, toggleTask } = useCore();
  const live = task ? tasks.find((t) => t.id === task.id) ?? task : null;
  const goal = goals.find((g) => g.id === live?.goalId);
  const project = projects.find((p) => p.id === live?.projectId);
  return (
    <Overlay
      open={!!task}
      onClose={onClose}
      title={live?.title ?? 'Task'}
      footer={live && (
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" icon="check" onClick={() => toggleTask(live.id)}>{live.done ? 'Mark incomplete' : 'Mark complete'}</Button>
        </>
      )}
    >
      {live && (
        <div className="detail-grid">
          {live.notes && <p className="muted">{live.notes}</p>}
          <dl className="facts">
            <dt>Status</dt><dd><Badge tone={live.done ? 'ok' : undefined}>{live.done ? 'Completed' : 'Open'}</Badge></dd>
            <dt>Due</dt><dd>{live.due ? relativeDay(live.due) : 'No date'}</dd>
            <dt>Priority</dt><dd style={{ textTransform: 'capitalize' }}>{live.priority}</dd>
            <dt>Domain</dt><dd>{domainName(live.domain)}</dd>
            {live.estimateMin && <><dt>Estimate</dt><dd>{live.estimateMin} min</dd></>}
            {goal && <><dt>Goal</dt><dd>{goal.title}</dd></>}
            {project && <><dt>Project</dt><dd>{project.title}</dd></>}
          </dl>
        </div>
      )}
    </Overlay>
  );
}
