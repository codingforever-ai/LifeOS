import { CrudList } from '../../ui/CrudList';
import { PageHeader, Badge } from '../../ui/primitives';
import { useAuth } from '../../core/auth';
import { fmt, countdown } from '../../lib/tz';

export default function DeadlinesPage() {
  const { tz } = useAuth();
  return (
    <>
      <PageHeader eyebrow="Deadlines" title="What's due" subtitle="Anything time-bound — exams, deliverables, bills, appointments." />
      <CrudList entity="deadlines" sort="due_at:asc" pageSize={30}
        tabs={[
          { value: 'open', label: 'Open', filters: { status: 'open' } },
          { value: 'done', label: 'Done', filters: { status: 'done' } },
          { value: 'all', label: 'All', filters: {} },
        ]}
        sub={(r) => {
          const cd = countdown(r.due_at, Date.now());
          return `${fmt.dateTime(r.due_at, tz)} · ${cd.text}${r.importance ? ` · priority ${r.importance}` : ''}`;
        }}
        trailing={(r) => {
          if (r.status === 'done') return <Badge tone="ok">Done</Badge>;
          const cd = countdown(r.due_at, Date.now());
          if (cd.overdue) return <Badge tone="danger">Overdue</Badge>;
          if (cd.ms < 48 * 3600000) return <Badge tone="warn">Soon</Badge>;
          return <Badge>{cd.text}</Badge>;
        }}
        empty={{ title: 'No deadlines', text: 'Create a deadline for anything time-bound.' }}
      />
    </>
  );
}
