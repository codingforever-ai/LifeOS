import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ENT } from '../../core/entities';
import type { IconName } from '../../ui/Icon';
import { BubbleIcon, PageHeader } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';

const ITEMS: { entity?: string; to?: string; label: string; hint: string; icon: IconName; tone: string }[] = [
  { entity: 'tasks', label: 'Task', hint: 'Something to do', icon: 'tasks', tone: 'purple' }, { entity: 'goals', label: 'Goal', hint: 'An outcome to reach, with measurement', icon: 'goals', tone: 'royal' },
  { entity: 'projects', label: 'Project', hint: 'A body of work serving a goal', icon: 'projects', tone: 'royal' }, { entity: 'milestones', label: 'Milestone', hint: 'A meaningful checkpoint', icon: 'flag', tone: 'lavender' },
  { entity: 'deadlines', label: 'Deadline', hint: 'Anything time-bound', icon: 'clock', tone: 'plum' }, { entity: 'events', label: 'Event', hint: 'Calendar entry or appointment', icon: 'calendar', tone: 'slate' },
  { entity: 'habits', label: 'Habit', hint: 'A repeatable action', icon: 'repeat', tone: 'mist' }, { to: '/focus', label: 'Focus session', hint: 'Start a timed session', icon: 'focus', tone: 'purple' },
  { entity: 'notes', label: 'Note', hint: 'Write something down', icon: 'note', tone: 'graphite' }, { entity: 'memories', label: 'Memory', hint: 'A fact, principle or lesson', icon: 'brain', tone: 'lavender' },
  { entity: 'decisions', label: 'Decision', hint: 'Record a choice and its reasoning', icon: 'target', tone: 'sand' }, { entity: 'experiments', label: 'Experiment', hint: 'Test a change', icon: 'flask', tone: 'plum' },
  { to: '/review', label: 'Review', hint: 'Daily to yearly reflection', icon: 'eye', tone: 'slate' }, { entity: 'accomplishments', label: 'Accomplishment', hint: 'A life receipt with evidence', icon: 'trophy', tone: 'sand' },
  { entity: 'custom_domains', label: 'Custom domain', hint: 'Music, Travel, Business…', icon: 'layers', tone: 'purple' },
];

export default function CreatePage() {
  const nav = useNavigate(); const [entity, setEntity] = useState<string | null>(null);
  return (
    <>
      <PageHeader eyebrow="Create" title="Make anything" subtitle="One place to create. Link goals, projects and milestones in the form and LifeOS connects everything for you." />
      <div className="domain-grid stagger">
        {ITEMS.map((i) => (
          <button key={i.label} type="button" className="domain-tile" onClick={() => (i.entity ? setEntity(i.entity) : nav(i.to!))}>
            <BubbleIcon name={i.icon} tone={i.tone} size="lg" /><span className="row-title">{i.label}</span><span className="row-sub">{i.hint}</span>
          </button>
        ))}
      </div>
      {entity && ENT[entity] && <EntityForm entity={entity} open onClose={() => setEntity(null)} />}
    </>
  );
}
