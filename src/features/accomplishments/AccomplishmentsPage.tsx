import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { domainName } from '../../core/domains';
import { Badge, BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { fmt } from '../../lib/tz';
import { useState } from 'react';

interface AccomplishmentView { records: { id: string; title: string; description: string | null; domain: string; achieved_on: string; kind: string }[]; completedGoals: { id: string; title: string }[]; completedProjects: { id: string; title: string }[]; milestones: { id: string; title: string }[] }

export default function AccomplishmentsPage() {
  const { tz } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useApi<AccomplishmentView>('/accomplishments-view');

  return (
    <>
      <PageHeader eyebrow="Accomplishments" title="What you've achieved" subtitle="Real wins, not task-completion spam."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New</Button>} />
      {loading && !data && <Surface><LoadingState label="Loading accomplishments" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && (
        <>
          {data.records.length === 0 && data.completedGoals.length === 0 && data.completedProjects.length === 0 ? (
            <Surface><EmptyState icon="trophy" title="No accomplishments yet" text="Record a real achievement — a win, certification, or milestone." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New</Button>} /></Surface>
          ) : (
            <>
              {data.records.length > 0 && (
                <Surface pad="none"><ul className="list divided">
                  {data.records.map((a) => (
                    <li key={a.id}><Row as="div"
                      leading={<BubbleIcon name="trophy" tone="sand" size="sm" />}
                      title={a.title}
                      subtitle={`${a.kind} · ${domainName(a.domain)} · ${fmt.date(a.achieved_on, tz)}`}
                      trailing={a.description ? <Badge>{a.description.slice(0, 30)}</Badge> : undefined}
                    /></li>
                  ))}
                </ul></Surface>
              )}
              {data.completedGoals.length > 0 && (
                <Surface pad="none" style={{ marginTop: 16 }}><ul className="list divided">
                  {data.completedGoals.map((g) => <li key={g.id}><Row as="div" leading={<BubbleIcon name="goals" tone="royal" size="sm" />} title={g.title} subtitle="Goal completed" /></li>)}
                </ul></Surface>
              )}
              {data.completedProjects.length > 0 && (
                <Surface pad="none" style={{ marginTop: 16 }}><ul className="list divided">
                  {data.completedProjects.map((p) => <li key={p.id}><Row as="div" leading={<BubbleIcon name="projects" tone="royal" size="sm" />} title={p.title} subtitle="Project completed" /></li>)}
                </ul></Surface>
              )}
            </>
          )}
        </>
      )}
      <EntityForm entity="accomplishments" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
