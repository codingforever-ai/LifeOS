import { useMemo, useState } from 'react';
import { useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import type { Task } from '../../core/types';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Surface, Tabs } from '../../ui/primitives';
import { Menu } from '../../ui/overlay';
import { Icon } from '../../ui/Icon';
import { EntityForm } from '../../ui/EntityForm';
import { relDay } from '../../lib/tz';
import { TaskDetail, TaskRow } from './TaskParts';

type Filter = 'open' | 'today' | 'upcoming' | 'done';
type Sort = 'due' | 'priority' | 'title';
const PRI = { high: 0, medium: 1, low: 2 } as const;

export default function TasksPage() {
  const { tasks, status, reload } = useCore();
  const { tz } = useAuth();
  const [filter, setFilter] = useState<Filter>('open');
  const [sort, setSort] = useState<Sort>('due');
  const [open, setOpen] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    const f = tasks.filter((t) => {
      const done = !!t.done_at;
      if (filter === 'done') return done;
      if (done) return false;
      if (filter === 'today') return !!t.due_at && !relDay(t.due_at, tz).includes('overdue') && (relDay(t.due_at, tz) === 'Today' || relDay(t.due_at, tz).includes('overdue') || relDay(t.due_at, tz).includes('ago'));
      if (filter === 'upcoming') return !!t.due_at && !relDay(t.due_at, tz).includes('overdue') && !relDay(t.due_at, tz).includes('ago') && relDay(t.due_at, tz) !== 'Today';
      return true;
    });
    return [...f].sort((a, b) => {
      if (sort === 'priority') return PRI[a.priority] - PRI[b.priority];
      if (sort === 'title') return a.title.localeCompare(b.title);
      return (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999');
    });
  }, [tasks, filter, sort, tz]);

  const remaining = tasks.filter((t) => !t.done_at).length;

  return (
    <>
      <PageHeader eyebrow="Tasks" title="Everything to do" subtitle={status === 'ready' ? `${remaining} open across all of your life.` : undefined}
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New task</Button>} />
      <div className="toolbar">
        <Tabs<Filter> label="Filter tasks" value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'done', label: 'Completed' }]} />
        <Menu<Sort> label="Sort tasks" value={sort} onSelect={setSort} trigger={<><Icon name="sort" />Sort</>} options={[{ value: 'due', label: 'Due date' }, { value: 'priority', label: 'Priority' }, { value: 'title', label: 'Title' }]} />
      </div>
      <Surface pad="none" className="tasks-surface">
        {status === 'loading' && <div style={{ padding: 12 }}><LoadingState label="Loading tasks" /></div>}
        {status === 'error' && <ErrorState text="We couldn't load your tasks. Check your connection and try again." onRetry={reload} />}
        {status === 'ready' && visible.length === 0 && (
          <EmptyState icon="tasks" title={filter === 'done' ? 'Nothing completed yet' : "You're all clear"} text={filter === 'done' ? 'Completed tasks will collect here as a record of what you\u2019ve done.' : 'No tasks match this view. Capture something new when it comes to mind.'} action={<Button onClick={() => setCreating(true)}>New task</Button>} />
        )}
        {status === 'ready' && visible.length > 0 && (
          <ul className="list divided stagger" key={filter + sort}>
            {visible.map((t) => <li key={t.id}><TaskRow task={t} onOpen={setOpen} /></li>)}
          </ul>
        )}
      </Surface>
      <TaskDetail task={open} onClose={() => setOpen(null)} />
      <EntityForm entity="tasks" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
