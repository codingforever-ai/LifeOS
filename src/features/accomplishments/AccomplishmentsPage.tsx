import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { domainName } from '../../core/domains';
import { BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Section, Surface } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { fmt } from '../../lib/tz';
import { useState } from 'react';

interface AccomplishmentView {
  records: { id: string; title: string; description: string | null; domain: string; achieved_on: string; kind: string; evidence_url: string | null }[];
  completedGoals: { id: string; title: string; at: string; progress: number }[];
  completedProjects: { id: string; title: string; at: string; tasksDone: number }[];
  milestones: { id: string; title: string; at: string }[];
}

const KIND_LABEL: Record<string, string> = { win: 'Win', certification: 'Certification', milestone: 'Milestone', work: 'Work', personal: 'Personal' };

export default function AccomplishmentsPage() {
  const { tz } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useApi<AccomplishmentView>('/accomplishments-view');

  const total = data ? data.records.length + data.completedGoals.length + data.completedProjects.length + data.milestones.length : 0;

  return (
    <>
      <PageHeader eyebrow="Accomplishments" title="What you've achieved" subtitle="Real wins from your records — completed goals, projects, milestones. Restrained and honest."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Record</Button>} />

      {loading && !data && <Surface><LoadingState label="Loading accomplishments" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}

      {data && total === 0 && (
        <Surface><EmptyState icon="trophy" title="No accomplishments yet" text="Complete a goal or project, or record a real achievement — a win, certification, or milestone." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Record</Button>} /></Surface>
      )}

      {data && total > 0 && (
        <>
          {data.records.length > 0 && (
            <Section title="Recorded achievements">
              <Surface pad="none"><ul className="list divided">
                {data.records.map((a) => (
                  <li key={a.id} className="accomplishment-item"><Row as="div"
                    leading={<BubbleIcon name="trophy" tone="sand" size="sm" />}
                    title={a.title}
                    subtitle={<span>{KIND_LABEL[a.kind] ?? a.kind} · {domainName(a.domain)} · {fmt.date(a.achieved_on, tz)}</span>}
                    trailing={a.description ? <span className="muted small" style={{ maxWidth: 200, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</span> : undefined}
                  /></li>
                ))}
              </ul></Surface>
            </Section>
          )}

          {data.completedGoals.length > 0 && (
            <Section title="Goals completed">
              <Surface pad="none"><ul className="list divided">
                {data.completedGoals.map((g) => (
                  <li key={g.id} className="accomplishment-item"><Row as="div"
                    leading={<BubbleIcon name="goals" tone="royal" size="sm" />}
                    title={g.title}
                    subtitle={<span>Goal completed{g.at ? ` · ${fmt.date(g.at, tz)}` : ''}</span>}
                  /></li>
                ))}
              </ul></Surface>
            </Section>
          )}

          {data.completedProjects.length > 0 && (
            <Section title="Projects completed">
              <Surface pad="none"><ul className="list divided">
                {data.completedProjects.map((p) => (
                  <li key={p.id} className="accomplishment-item"><Row as="div"
                    leading={<BubbleIcon name="projects" tone="royal" size="sm" />}
                    title={p.title}
                    subtitle={<span>Project completed{p.at ? ` · ${fmt.date(p.at, tz)}` : ''}{p.tasksDone ? ` · ${p.tasksDone} tasks done` : ''}</span>}
                  /></li>
                ))}
              </ul></Surface>
            </Section>
          )}

          {data.milestones.length > 0 && (
            <Section title="Milestones reached">
              <Surface pad="none"><ul className="list divided">
                {data.milestones.map((m) => (
                  <li key={m.id} className="accomplishment-item"><Row as="div"
                    leading={<BubbleIcon name="flag" tone="lavender" size="sm" />}
                    title={m.title}
                    subtitle={<span>Milestone reached{m.at ? ` · ${fmt.date(m.at, tz)}` : ''}</span>}
                  /></li>
                ))}
              </ul></Surface>
            </Section>
          )}
        </>
      )}

      <EntityForm entity="accomplishments" open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
