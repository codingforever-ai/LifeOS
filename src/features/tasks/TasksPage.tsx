import { useMemo, useState } from 'react';
import { useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { api } from '../../api/client';
import type { Task } from '../../core/types';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, SearchField, Surface, Tabs } from '../../ui/primitives';
import { Menu } from '../../ui/overlay';
import { Icon } from '../../ui/Icon';
import { EntityForm } from '../../ui/EntityForm';
import { relDay } from '../../lib/tz';
import { TaskDetail, TaskRow } from './TaskParts';

type Filter = 'open' | 'today' | 'overdue' | 'upcoming' | 'done';
type Sort = 'due' | 'priority' | 'title';
const PRI = { high: 0, medium: 1, low: 2 } as const;

export default function TasksPage() {
  const { tasks, status, reload } = useCore();
  const { tz } = useAuth();
  const [filter, setFilter] = useState<Filter>('open');
  const [sort, setSort] = useState<Sort>('due');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [quickAdd, setQuickAdd] = useState('');

  const visible = useMemo(() => {
    const query = q.toLowerCase().trim();
    const f = tasks.filter((t) => {
      if (query && !t.title.toLowerCase().includes(query)) return false;
      const done = !!t.done_at;
      if (filter === 'done') return done;
      if (done) return false;
      const rd = t.due_at ? relDay(t.due_at, tz) : null;
      const isOverdue = !!rd && (rd.includes('overdue') || rd.includes('ago'));
      const isToday = rd === 'Today';
      const isUpcoming = !!rd && !isOverdue && !isToday;
      if (filter === 'overdue') return isOverdue;
      if (filter === 'today') return isToday || isOverdue;
      if (filter === 'upcoming') return isUpcoming;
      return true;
    });
    return [...f].sort((a, b) => {
      if (sort === 'priority') return PRI[a.priority] - PRI[b.priority];
      if (sort === 'title') return a.title.localeCompare(b.title);
      return (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999');
    });
  }, [tasks, filter, sort, q, tz]);

  const remaining = tasks.filter((t) => !t.done_at).length;
  const overdueCount = tasks.filter((t) => !t.done_at && t.due_at && (relDay(t.due_at, tz).includes('overdue') || relDay(t.due_at, tz).includes('ago'))).length;

  const saveQuick = () => {
    const v = quickAdd.trim();
    if (!v) return;
    api.post('/e/tasks', { title: v, priority: 'medium', domain: 'personal' }).then(() => { setQuickAdd(''); });
  };

  return (
    <>
      <PageHeader eyebrow="Tasks" title="Everything to do" subtitle={status === 'ready' ? `${remaining} open${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}` : undefined}
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New task</Button>} />

      <div className="quick-add">
        <input
          className="input"
          type="text"
          placeholder="Quick add a task — press Enter"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveQuick(); }}
          aria-label="Quick add task"
        />
        <Button variant="primary" icon="plus" onClick={saveQuick} disabled={!quickAdd.trim()}>Add</Button>
      </div>

      <div className="toolbar">
        <Tabs<Filter> label="Filter tasks" value={filter} onChange={setFilter} options={[
          { value: 'open', label: 'Open' },
          { value: 'today', label: 'Today' },
          { value: 'overdue', label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'done', label: 'Completed' },
        ]} />
        <SearchField aria-label="Search tasks" placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
        <Menu<Sort> label="Sort tasks" value={sort} onSelect={setSort} trigger={<><Icon name="sort" />Sort</>} options={[{ value: 'due', label: 'Due date' }, { value: 'priority', label: 'Priority' }, { value: 'title', label: 'Title' }]} />
      </div>
      <Surface pad="none" className="tasks-surface">
        {status === 'loading' && <div style={{ padding: 12 }}><LoadingState label="Loading tasks" /></div>}
        {status === 'error' && <ErrorState text="We couldn't load your tasks. Check your connection and try again." onRetry={reload} />}
        {status === 'ready' && visible.length === 0 && (
          <EmptyState icon="tasks" title={filter === 'done' ? 'Nothing completed yet' : q ? 'No matches' : "You're all clear"} text={q ? `Nothing matches "${q}".` : filter === 'done' ? 'Completed tasks will collect here as a record of what you\u2019ve done.' : filter === 'overdue' ? 'No overdue tasks. You\u2019re on top of things.' : 'No tasks match this view. Capture something new when it comes to mind.'} action={!q ? <Button onClick={() => setCreating(true)}>New task</Button> : undefined} />
        )}
        {status === 'ready' && visible.length > 0 && (
          <ul className="list divided stagger" key={filter + sort + q}>
            {visible.map((t) => <li key={t.id}><TaskRow task={t} onOpen={setOpen} /></li>)}
          </ul>
        )}
      </Surface>
      <TaskDetail task={open} onClose={() => setOpen(null)} />
      <EntityForm entity="tasks" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
