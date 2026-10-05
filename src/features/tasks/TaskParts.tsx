import { useState } from 'react';
import type { Task } from '../../core/types';
import { domainName } from '../../core/domains';
import { useCore } from '../../core/store';
import { api } from '../../api/client';
import { Badge, Button, Checkbox } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { EntityForm } from '../../ui/EntityForm';
import { fmt, relDay, minutesLabel } from '../../lib/tz';
import { useAuth } from '../../core/auth';

const isDone = (t: Task) => !!t.done_at;

export function dueTone(t: Task, tz: string): 'danger' | 'accent' | undefined {
  if (!t.due_at || isDone(t)) return undefined;
  const n = relDay(t.due_at, tz);
  if (n.includes('overdue') || n.includes('ago')) return 'danger';
  if (n === 'Today' || n === 'Tomorrow') return 'accent';
  return undefined;
}

/** Shared task row — used by Today, Tasks, Goals, Projects. */
export function TaskRow({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { run } = useCore();
  const { tz } = useAuth();
  const done = isDone(task);
  const tone = dueTone(task, tz);
  const toggle = () => run(() => api.post(`/e/tasks/${task.id}/${done ? 'reopen' : 'complete'}`), done ? 'Reopened' : 'Task completed');
  return (
    <div className="row task-row" data-done={done}>
      <Checkbox checked={done} onChange={toggle} label={`Mark “${task.title}” ${done ? 'incomplete' : 'complete'}`} />
      <button type="button" className="row-main task-main" onClick={() => onOpen(task)}>
        <span className="row-title task-title">{task.title}</span>
        <span className="row-sub">{domainName(task.domain)}{task.estimate_min ? ` · ${minutesLabel(task.estimate_min)}` : ''}</span>
      </button>
      {task.due_at && <Badge tone={tone}>{relDay(task.due_at, tz)}</Badge>}
    </div>
  );
}

export function TaskDetail({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { tasks, goals, projects, run } = useCore();
  const { tz } = useAuth();
  const [editing, setEditing] = useState(false);
  const live = task ? tasks.find((t) => t.id === task.id) ?? task : null;
  const done = live ? isDone(live) : false;
  const goal = goals.find((g) => g.id === live?.goal_id);
  const project = projects.find((p) => p.id === live?.project_id);
  const toggle = () => run(() => api.post(`/e/tasks/${live!.id}/${done ? 'reopen' : 'complete'}`), done ? 'Reopened' : 'Task completed');

  if (editing && live) return <EntityForm entity="tasks" record={live} open={true} onClose={() => { setEditing(false); onClose(); }} />;

  return (
    <Overlay open={!!task} onClose={onClose} title={live?.title ?? 'Task'}
      footer={live && <>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Button>
        <Button variant="primary" icon="check" onClick={toggle}>{done ? 'Reopen' : 'Complete'}</Button>
      </>}>
      {live && (
        <div className="detail-grid">
          {live.notes && <p className="muted">{live.notes}</p>}
          <dl className="facts">
            <dt>Status</dt><dd><Badge tone={done ? 'ok' : undefined}>{done ? 'Completed' : 'Open'}</Badge></dd>
            {live.due_at && <><dt>Due</dt><dd>{fmt.dateTime(live.due_at, tz)}</dd></>}
            <dt>Priority</dt><dd style={{ textTransform: 'capitalize' }}>{live.priority}</dd>
            <dt>Domain</dt><dd>{domainName(live.domain)}</dd>
            {live.estimate_min != null && <><dt>Estimate</dt><dd>{minutesLabel(live.estimate_min)}</dd></>}
            {live.actual_min != null && <><dt>Actual</dt><dd>{minutesLabel(live.actual_min)}</dd></>}
            {goal && <><dt>Goal</dt><dd>{goal.title}</dd></>}
            {project && <><dt>Project</dt><dd>{project.title}</dd></>}
            {live.tags?.length ? <><dt>Tags</dt><dd>{live.tags.join(', ')}</dd></> : null}
          </dl>
        </div>
      )}
    </Overlay>
  );
}
