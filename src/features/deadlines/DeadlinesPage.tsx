import { CrudList } from '../../ui/CrudList';
import { PageHeader } from '../../ui/primitives';
import { useAuth } from '../../core/auth';
import { fmt, relDay, countdown } from '../../lib/tz';

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
        empty={{ title: 'No deadlines', text: 'Create a deadline for anything time-bound.' }}
      />
    </>
  );
}
