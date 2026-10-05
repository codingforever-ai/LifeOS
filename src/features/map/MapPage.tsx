import { useState } from 'react';
import { useApi } from '../../core/store';
import { useAuth } from '../../core/auth';
import { useNavigate } from 'react-router-dom';
import { BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface } from '../../ui/primitives';

interface MapNode { id: string; title: string; kind: string; status: string | null; domain: string | null }
interface MapEdge { from: string; to: string; label: string }
interface MapData { goal: { id: string; title: string }; nodes: MapNode[]; edges: MapEdge[] }

export default function MapPage() {
  const nav = useNavigate();
  const { tz } = useAuth();
  const [goalId, setGoalId] = useState<string | null>(null);
  const { data, loading, error, reload } = useApi<MapData | null>(goalId ? `/map/${goalId}` : null);

  // TODO: goal picker — for now use first goal from store
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
