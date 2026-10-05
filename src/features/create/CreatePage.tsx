import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BubbleIcon, PageHeader } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import type { IconName } from '../../ui/Icon';

type CreateOption = { label: string; sub: string; icon: IconName; tone: string; entity?: string; path?: string };

const OPTIONS: CreateOption[] = [
  { entity: 'tasks', label: 'Task', sub: 'Something to do', icon: 'tasks', tone: 'purple' },
  { entity: 'goals', label: 'Goal', sub: 'An outcome to reach, with measurement', icon: 'goals', tone: 'royal' },
  { entity: 'projects', label: 'Project', sub: 'A body of work that serves a goal', icon: 'projects', tone: 'graphite' },
  { entity: 'milestones', label: 'Milestone', sub: 'A checkpoint inside a project', icon: 'flag', tone: 'graphite' },
  { entity: 'deadlines', label: 'Deadline', sub: 'A hard date you must not miss', icon: 'flag', tone: 'plum' },
  { entity: 'events', label: 'Event', sub: 'Something on your calendar', icon: 'calendar', tone: 'slate' },
  { entity: 'habits', label: 'Habit', sub: 'A practice you repeat', icon: 'repeat', tone: 'mist' },
  { path: '/focus', label: 'Focus session', sub: 'Protected time on one thing', icon: 'focus', tone: 'purple' },
  { entity: 'notes', label: 'Note', sub: 'Something to write down', icon: 'note', tone: 'graphite' },
  { entity: 'memories', label: 'Memory', sub: 'What LifeOS should remember', icon: 'brain', tone: 'lavender' },
  { entity: 'decisions', label: 'Decision', sub: 'A choice, and the reasoning', icon: 'compass', tone: 'sand' },
  { entity: 'experiments', label: 'Experiment', sub: 'A question you are testing', icon: 'flask', tone: 'plum' },
  { path: '/review', label: 'Review', sub: 'Look back, then adjust', icon: 'eye', tone: 'graphite' },
  { entity: 'accomplishments', label: 'Accomplishment', sub: 'Proof of progress', icon: 'trophy', tone: 'sand' },
  { path: '/domains', label: 'Custom domain', sub: 'A new area of your life', icon: 'domains', tone: 'purple' },
];

export default function CreatePage() {
  const nav = useNavigate();
  const [entity, setEntity] = useState<string | null>(null);

  return (
    <>
      <PageHeader eyebrow="Create" title="Make anything" subtitle="One place to create. Link goals, projects and milestones in the form and LifeOS connects everything for you." />
      <div className="domain-grid stagger">
        {OPTIONS.map((o) => (
          <button key={o.label} type="button" className="domain-tile" onClick={() => { if (o.path) nav(o.path); else if (o.entity) setEntity(o.entity); }}>
            <BubbleIcon name={o.icon} tone={o.tone} size="lg" />
            <span className="row-title">{o.label}</span>
            <span className="row-sub">{o.sub}</span>
          </button>
        ))}
      </div>
      {entity && <EntityForm entity={entity} open={true} onClose={() => setEntity(null)} onSaved={() => { setEntity(null); nav('/tasks'); }} />}
    </>
  );
}
