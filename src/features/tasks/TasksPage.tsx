import { useState } from 'react';
import { useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { domainName } from '../../core/domains';
import { TASK_TYPES } from '../../core/entities';
import { relDay } from '../../lib/tz';
import { Badge, Checkbox, PageHeader } from '../../ui/primitives';
import { CrudList } from '../../ui/CrudList';
import { label } from '../common/kit';

const ACTIVE = 'inbox,planned,in_progress,blocked,waiting';

export default function TasksPage() {
  const { toggleTask } = useCore(); const { tz } = useAuth(); const [type, setType] = useState('');
  return (
    <>
      <PageHeader eyebrow="Tasks" title="Everything to do" subtitle="One task system for every domain — types, statuses, dependencies, goals and deadlines." />
      <CrudList entity="tasks" sort="due_at:asc" filters={type ? { task_type: type } : undefined}
        tabs={[{ value: 'active', label: 'Active', filters: { status: ACTIVE } }, { value: 'inbox', label: 'Inbox', filters: { status: 'inbox' } }, { value: 'blocked', label: 'Blocked / waiting', filters: { status: 'blocked,waiting' } }, { value: 'done', label: 'Done', filters: { status: 'completed' } }, { value: 'later', label: 'Deferred / cancelled', filters: { status: 'deferred,cancelled' } }]}
        toolbar={<select className="input compact" aria-label="Task type" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>}
        leading={(r) => <Checkbox checked={!!r.done_at} onChange={() => toggleTask(r.id)} label={`Mark “${r.title}” ${r.done_at ? 'incomplete' : 'complete'}`} />}
        sub={(r) => <>{label(r.task_type)} · {domainName(r.domain)}{r.estimate_min ? ` · ${r.estimate_min} min` : ''}{r.priority === 'high' ? ' · High priority' : ''}{r.blocker ? ` · Blocked: ${r.blocker}` : ''}</>}
        trailing={(r) => (r.due_at && !r.done_at ? <Badge tone={new Date(r.due_at).getTime() < Date.now() ? 'danger' : undefined}>{relDay(r.due_at, tz)}</Badge> : r.status !== 'planned' && r.status !== 'completed' ? <Badge>{label(r.status)}</Badge> : undefined)}
        empty={{ title: "You're all clear", text: 'Create a task, or capture a thought and convert it later.' }} />
    </>
  );
}
