import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { useParams, useNavigate } from 'react-router-dom';
import { DOMAINS } from '../../core/domains';
import { Badge, BubbleIcon, Button, EmptyState, ErrorState, LoadingState, PageHeader, Row, Section, Surface } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { relDay, minutesLabel } from '../../lib/tz';
import { useState } from 'react';

type Rec = Record<string, any>;

export default function DomainPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { tz } = useAuth();
  const { tasks, goals, projects } = useCore();
  const [creating, setCreating] = useState<string | null>(null);
  const domain = DOMAINS.find((d) => d.id === id);

  const { data, loading, error, reload } = useApi<Record<string, unknown> | null>(id ? `/domains/${id}/overview` : null);

  if (!domain) return <EmptyState icon="alert" title="Unknown domain" text="That domain doesn't exist." action={<Button onClick={() => nav('/domains')}>Back to domains</Button>} />;
  if (loading && !data) return <div style={{ padding: 24 }}><LoadingState label={`Loading ${domain.name}`} /></div>;
  if (error) return <ErrorState text={error} onRetry={reload} />;

  const domainTasks = tasks.filter((t) => t.domain === id && !t.done_at);
  const domainGoals = goals.filter((g) => g.domain === id);
  const domainProjects = projects.filter((p) => p.domain === id);

  const overview = data ?? {};
  const workflow = (overview.workflow ?? overview.flow ?? []) as string[];

  return (
    <>
      <PageHeader eyebrow={domain.name} title={domain.blurb}
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating('tasks')}>New task</Button>} />

      {workflow.length > 0 && (
        <Surface style={{ marginBottom: 16 }}>
          <div className="caption">Workflow</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {workflow.map((w, i) => <Badge key={i} tone="accent">{w}</Badge>)}
          </div>
        </Surface>
      )}

      <div className="stats stagger" style={{ marginBottom: 16 }}>
        <div><div className="stat-num num">{domainTasks.length}</div><div className="muted small">Open tasks</div></div>
        <div><div className="stat-num num">{domainGoals.length}</div><div className="muted small">Goals</div></div>
        <div><div className="stat-num num">{domainProjects.length}</div><div className="muted small">Projects</div></div>
      </div>

      {id === 'study' && <StudyDomain overview={overview} />}
      {id === 'academic' && <AcademicDomain overview={overview} />}
      {id === 'work' && <WorkDomain overview={overview} />}
      {id === 'fitness' && <FitnessDomain overview={overview} />}
      {id === 'finance' && <FinanceDomain overview={overview} />}
      {id === 'personal' && <PersonalDomain overview={overview} />}

      {domainTasks.length > 0 && (
        <Section title="Open tasks">
          <Surface pad="none"><ul className="list divided">
            {domainTasks.slice(0, 10).map((t) => <li key={t.id}><Row as="div" leading={<BubbleIcon name="tasks" tone="graphite" size="sm" />} title={t.title} subtitle={t.due_at ? relDay(t.due_at, tz) : ''} /></li>)}
          </ul></Surface>
        </Section>
      )}

      {domainGoals.length > 0 && (
        <Section title="Goals">
          <Surface pad="none"><ul className="list divided">
            {domainGoals.map((g) => <li key={g.id}><Row as="div" leading={<BubbleIcon name="goals" tone="royal" size="sm" />} title={g.title} subtitle={g.horizon ?? ''} /></li>)}
          </ul></Surface>
        </Section>
      )}

      {creating && <EntityForm entity={creating} open={true} defaults={{ domain: id }} onClose={() => setCreating(null)} />}
    </>
  );
}

function StudyDomain({ overview }: { overview: Record<string, any> }) {
  const subjects = (overview.subjects ?? []) as Rec[];
  const weak = (overview.weakTopics ?? []) as Rec[];
  const revisionDue = (overview.revisionDue ?? []) as Rec[];
  const exams = (overview.exams ?? []) as Rec[];
  return (
    <>
      {subjects.length > 0 && <Section title="Subjects"><Surface pad="none"><ul className="list divided">
        {subjects.map((s) => <li key={s.id}><Row as="div" title={s.name} subtitle={`${s.covered}/${s.topics} topics · ${s.weak} weak · ${s.accuracy != null ? Math.round(s.accuracy * 100) : 0}% accuracy`} /></li>)}
      </ul></Surface></Section>}
      {weak.length > 0 && <Section title="Weak topics"><Surface pad="none"><ul className="list divided">{weak.map((t) => <li key={t.id}><Row as="div" leading={<BubbleIcon name="alert" tone="sand" size="sm" />} title={t.title} /></li>)}</ul></Surface></Section>}
      {revisionDue.length > 0 && <Section title="Revision due"><Surface pad="none"><ul className="list divided">{revisionDue.map((t) => <li key={t.id}><Row as="div" leading={<BubbleIcon name="repeat" tone="plum" size="sm" />} title={t.title} /></li>)}</ul></Surface></Section>}
      {exams.length > 0 && <Section title="Upcoming exams"><Surface pad="none"><ul className="list divided">{exams.map((e) => <li key={e.id}><Row as="div" leading={<BubbleIcon name="graduation" tone="lavender" size="sm" />} title={e.title} subtitle={`${e.daysLeft} days left`} /></li>)}</ul></Surface></Section>}
    </>
  );
}

function AcademicDomain({ overview }: { overview: Record<string, any> }) {
  const subjects = (overview.subjects ?? []) as Rec[];
  const exams = (overview.exams ?? []) as Rec[];
  const assignments = (overview.assignmentsOpen ?? []) as Rec[];
  return (
    <>
      {subjects.length > 0 && <Section title="Subjects"><Surface pad="none"><ul className="list divided">{subjects.map((s) => <li key={s.id}><Row as="div" title={s.name} subtitle={`${s.exams} exams · ${s.assignmentsOpen} open assignments`} /></li>)}</ul></Surface></Section>}
      {exams.length > 0 && <Section title="Upcoming exams"><Surface pad="none"><ul className="list divided">{exams.map((e) => <li key={e.id}><Row as="div" leading={<BubbleIcon name="graduation" tone="lavender" size="sm" />} title={e.title} subtitle={`${e.daysLeft} days left`} /></li>)}</ul></Surface></Section>}
      {assignments.length > 0 && <Section title="Open assignments"><Surface pad="none"><ul className="list divided">{assignments.map((a) => <li key={a.id}><Row as="div" leading={<BubbleIcon name="doc" tone="plum" size="sm" />} title={a.title} subtitle={a.daysLeft != null ? `${a.daysLeft} days left${a.overdue ? ' · overdue' : ''}` : ''} /></li>)}</ul></Surface></Section>}
    </>
  );
}

function WorkDomain({ overview }: { overview: Record<string, any> }) {
  const clients = (overview.clients ?? []) as Rec[];
  const dueSoon = (overview.dueSoon ?? []) as Rec[];
  const meetings = overview.meetings7d as Rec | undefined;
  return (
    <>
      {clients.length > 0 && <Section title="Clients"><Surface pad="none"><ul className="list divided">{clients.map((c) => <li key={c.id}><Row as="div" title={c.name} subtitle={`${c.deliverables} deliverables · ${c.open} open`} /></li>)}</ul></Surface></Section>}
      {dueSoon.length > 0 && <Section title="Due soon"><Surface pad="none"><ul className="list divided">{dueSoon.map((d) => <li key={d.id}><Row as="div" leading={<BubbleIcon name="flag" tone="plum" size="sm" />} title={d.title} subtitle={d.due_at ? relDay(d.due_at, 'UTC') : ''} trailing={d.overdue ? <Badge tone="danger">overdue</Badge> : undefined} /></li>)}</ul></Surface></Section>}
      {meetings && <Surface><p className="small muted">{meetings.count} meetings this week · {minutesLabel(meetings.minutes)}</p></Surface>}
    </>
  );
}

function FitnessDomain({ overview }: { overview: Record<string, any> }) {
  const programs = (overview.programs ?? []) as Rec[];
  const workouts = (overview.recentWorkouts ?? []) as Rec[];
  return (
    <>
      {programs.length > 0 && <Section title="Programs"><Surface pad="none"><ul className="list divided">{programs.map((p) => <li key={p.id}><Row as="div" title={p.title} subtitle={p.status} /></li>)}</ul></Surface></Section>}
      {workouts.length > 0 && <Section title="Recent workouts"><Surface pad="none"><ul className="list divided">{workouts.map((w) => <li key={w.id}><Row as="div" leading={<BubbleIcon name="dumbbell" tone="slate" size="sm" />} title={w.title} subtitle={`${w.duration_min} min${w.recovery ? ' · recovery' : ''}`} /></li>)}</ul></Surface></Section>}
    </>
  );
}

function FinanceDomain({ overview }: { overview: Record<string, any> }) {
  const items = (overview.items ?? []) as Rec[];
  return (
    <>
      {items.length > 0 && <Section title="Finance items"><Surface pad="none"><ul className="list divided">{items.map((i) => <li key={i.id}><Row as="div" title={i.title} subtitle={`${i.kind} · ${i.status}`} /></li>)}</ul></Surface></Section>}
      <Surface><p className="muted small">Finance structures are foundational. No real financial advice or transactions.</p></Surface>
    </>
  );
}

function PersonalDomain({ overview }: { overview: Record<string, any> }) {
  const items = (overview.items ?? []) as Rec[];
  return (
    <>
      {items.length > 0 && <Section title="Items"><Surface pad="none"><ul className="list divided">{items.map((i) => <li key={i.id}><Row as="div" title={i.title} subtitle={`${i.kind} · ${i.status}`} /></li>)}</ul></Surface></Section>}
    </>
  );
}
