import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BubbleIcon, Button, PageHeader, Surface } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import type { IconName } from '../../ui/Icon';

const OPTIONS: { entity: string; label: string; icon: IconName; tone: string }[] = [
  { entity: 'tasks', label: 'Task', icon: 'tasks', tone: 'purple' },
  { entity: 'deadlines', label: 'Deadline', icon: 'flag', tone: 'plum' },
  { entity: 'events', label: 'Event', icon: 'calendar', tone: 'royal' },
  { entity: 'goals', label: 'Goal', icon: 'goals', tone: 'royal' },
  { entity: 'projects', label: 'Project', icon: 'projects', tone: 'royal' },
  { entity: 'milestones', label: 'Milestone', icon: 'flag', tone: 'lavender' },
  { entity: 'habits', label: 'Habit', icon: 'repeat', tone: 'mist' },
  { entity: 'notes', label: 'Note', icon: 'note', tone: 'graphite' },
];

export default function CreatePage() {
  const nav = useNavigate();
  const [entity, setEntity] = useState<string | null>(null);

  return (
    <>
      <PageHeader eyebrow="Create" title="What do you want to make?" subtitle="A universal entry point for anything in LifeOS." />
      <div className="domain-grid stagger">
        {OPTIONS.map((o) => (
          <button key={o.entity} type="button" className="domain-tile" onClick={() => setEntity(o.entity)}>
            <BubbleIcon name={o.icon} tone={o.tone} size="lg" />
            <span className="row-title">{o.label}</span>
          </button>
        ))}
        <button type="button" className="domain-tile" onClick={() => nav('/capture')}>
          <BubbleIcon name="inbox" tone="purple" size="lg" />
          <span className="row-title">Capture</span>
          <span className="row-sub">Quick inbox</span>
        </button>
        <button type="button" className="domain-tile" onClick={() => nav('/agent')}>
          <BubbleIcon name="agent" tone="purple" size="lg" />
          <span className="row-title">Ask Agent</span>
          <span className="row-sub">Natural language</span>
        </button>
      </div>
      {entity && <EntityForm entity={entity} open={true} onClose={() => setEntity(null)} onSaved={() => { setEntity(null); nav('/tasks'); }} />}
    </>
  );
}
