import type { Task } from '../../core/types';
import { domainName } from '../../core/domains';
import { useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { Badge, Button, Checkbox } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { relDay } from '../../lib/tz';

export function dueTone(t: Task): 'danger' | 'accent' | undefined {
  if (!t.due_at || t.done_at) return undefined;
  const overdue = new Date(t.due_at).getTime() < Date.now();
  const today = new Date(t.due_at).toDateString() === new Date().toDateString();
  return overdue ? 'danger' : today ? 'accent' : undefined;
}

/** Shared task row — used by Today, Tasks, Goals, Projects. */
export function TaskRow({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { toggleTask } = useCore();
  const { tz } = useAuth();
  const tone = dueTone(task);
  return (
    <div className="row task-row" data-done={!!task.done_at}>
      <Checkbox checked={!!task.done_at} onChange={() => toggleTask(task.id)} label={`Mark “${task.title}” ${task.done_at ? 'incomplete' : 'complete'}`} />
      <button type="button" className="row-main task-main" onClick={() => onOpen(task)}>
        <span className="row-title task-title">{task.title}</span>
        <span className="row-sub">{domainName(task.domain)}{task.estimate_min ? ` · ${task.estimate_min} min` : ''}</span>
      </button>
      {task.due_at && <Badge tone={tone}>{relDay(task.due_at, tz)}</Badge>}
    </div>
  );
}

export function TaskDetail({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { tasks, goals, projects, toggleTask } = useCore();
  const { tz } = useAuth();
  const live = task ? tasks.find((t) => t.id === task.id) ?? task : null;
  const goal = goals.find((g) => g.id === live?.goal_id);
  const project = projects.find((p) => p.id === live?.project_id);
  return (
    <Overlay
      open={!!task}
      onClose={onClose}
      title={live?.title ?? 'Task'}
      footer={live && (
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" icon="check" onClick={() => toggleTask(live.id)}>{live.done_at ? 'Mark incomplete' : 'Mark complete'}</Button>
        </>
      )}
    >
      {live && (
        <div className="detail-grid">
          {live.notes && <p className="muted">{live.notes}</p>}
          <dl className="facts">
            <dt>Status</dt><dd><Badge tone={live.done_at ? 'ok' : undefined}>{live.done_at ? 'Completed' : 'Open'}</Badge></dd>
            <dt>Due</dt><dd>{live.due_at ? relDay(live.due_at, tz) : 'No date'}</dd>
            <dt>Priority</dt><dd style={{ textTransform: 'capitalize' }}>{live.priority}</dd>
            <dt>Domain</dt><dd>{domainName(live.domain)}</dd>
            {live.estimate_min ? <><dt>Estimate</dt><dd>{live.estimate_min} min</dd></> : null}
            {goal ? <><dt>Goal</dt><dd>{goal.title}</dd></> : null}
            {project ? <><dt>Project</dt><dd>{project.title}</dd></> : null}
          </dl>
        </div>
      )}
    </Overlay>
  );
}
