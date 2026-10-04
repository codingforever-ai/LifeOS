import { useMemo, useState } from 'react';
import { useCore } from '../../core/store';
import type { Task } from '../../core/types';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Surface, Tabs } from '../../ui/primitives';
import { Menu } from '../../ui/overlay';
import { Icon } from '../../ui/Icon';
import { diffDays } from '../../lib/date';
import { TaskDetail, TaskRow } from './TaskParts';
import { useNavigate } from 'react-router-dom';

type Filter = 'open' | 'today' | 'upcoming' | 'done';
type Sort = 'due' | 'priority' | 'title';
const PRI = { high: 0, medium: 1, low: 2 } as const;

export default function TasksPage() {
  const { tasks, status, reload } = useCore();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>('open');
  const [sort, setSort] = useState<Sort>('due');
  const [open, setOpen] = useState<Task | null>(null);

  const visible = useMemo(() => {
    const now = new Date();
    const f = tasks.filter((t) => {
      if (filter === 'done') return t.done;
      if (t.done) return false;
      if (filter === 'today') return !!t.due && diffDays(t.due, now) <= 0;
      if (filter === 'upcoming') return !!t.due && diffDays(t.due, now) > 0;
      return true;
    });
    return [...f].sort((a, b) => {
      if (sort === 'priority') return PRI[a.priority] - PRI[b.priority];
      if (sort === 'title') return a.title.localeCompare(b.title);
      return (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity);
    });
  }, [tasks, filter, sort]);

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <>
      <PageHeader
        eyebrow="Tasks"
        title="Everything to do"
        subtitle={status === 'ready' ? `${remaining} open across all of your life.` : undefined}
        actions={<Button variant="primary" icon="plus" onClick={() => nav('/capture')}>New task</Button>}
      />
      <div className="toolbar">
        <Tabs<Filter> label="Filter tasks" value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'done', label: 'Completed' }]} />
        <Menu<Sort> label="Sort tasks" value={sort} onSelect={setSort} trigger={<><Icon name="sort" />Sort</>} options={[{ value: 'due', label: 'Due date' }, { value: 'priority', label: 'Priority' }, { value: 'title', label: 'Title' }]} />
      </div>
      <Surface pad="none" className="tasks-surface">
        {status === 'loading' && <div style={{ padding: 12 }}><LoadingState label="Loading tasks" /></div>}
        {status === 'error' && <ErrorState text="We couldn’t load your tasks. Check your connection and try again." onRetry={reload} />}
        {status === 'ready' && visible.length === 0 && (
          <EmptyState icon="tasks" title={filter === 'done' ? 'Nothing completed yet' : 'You’re all clear'} text={filter === 'done' ? 'Completed tasks will collect here as a record of what you’ve done.' : 'No tasks match this view. Capture something new when it comes to mind.'} action={<Button onClick={() => nav('/capture')}>Capture a task</Button>} />
        )}
        {status === 'ready' && visible.length > 0 && (
          <ul className="list divided stagger" key={filter + sort}>
            {visible.map((t) => <li key={t.id}><TaskRow task={t} onOpen={setOpen} /></li>)}
          </ul>
        )}
      </Surface>
      <TaskDetail task={open} onClose={() => setOpen(null)} />
    </>
  );
}
