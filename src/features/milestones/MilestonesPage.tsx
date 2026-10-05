import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { Badge, BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface, ProgressBar } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { relDay } from '../../lib/tz';
import { useState } from 'react';

interface MilestoneView { id: string; title: string; project_id: string | null; goal_id: string | null; due_at: string | null; done_at: string | null; progress: number; tasksTotal: number; tasksDone: number; derived_status: string }

export default function MilestonesPage() {
  const { tz } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useApi<MilestoneView[]>('/milestones-view');

  return (
    <>
      <PageHeader eyebrow="Milestones" title="Measurable checkpoints" subtitle="Progress is derived from the tasks under each milestone."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New milestone</Button>} />
      {loading && !data && <Surface><LoadingState label="Loading milestones" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && data.length === 0 && <Surface><EmptyState icon="flag" title="No milestones" text="Create milestones to track progress on your projects." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New milestone</Button>} /></Surface>}
      {data && data.length > 0 && (
        <Surface pad="none"><ul className="list divided">
          {data.map((m) => (
            <li key={m.id}><Row as="div"
              leading={<BubbleIcon name="flag" tone={m.done_at ? 'mist' : 'lavender'} size="sm" />}
              title={m.title}
              subtitle={`${m.tasksDone}/${m.tasksTotal} tasks · ${m.due_at ? relDay(m.due_at, tz) : 'No due date'}`}
              trailing={<Badge tone={m.done_at ? 'ok' : m.derived_status === 'at_risk' ? 'warn' : undefined}>{m.done_at ? 'Done' : m.derived_status}</Badge>}
            />
            {m.tasksTotal > 0 && <div style={{ padding: '0 16px 12px 48px' }}><ProgressBar value={m.progress} label={m.title} /></div>}</li>
          ))}
        </ul></Surface>
      )}
      <EntityForm entity="milestones" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
