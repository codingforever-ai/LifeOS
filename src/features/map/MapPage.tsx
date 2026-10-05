import { useNavigate } from 'react-router-dom';
import { Button, PageHeader, Surface } from '../../ui/primitives';

export default function MapPage() {
  const nav = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Map" title="How it connects" subtitle="See the relationships between goals, projects, milestones and tasks." />
      <Surface>
        <p className="muted small">Select a goal to see its relationship map.</p>
        <Button onClick={() => nav('/goals')}>Choose a goal</Button>
      </Surface>
    </>
  );
}
