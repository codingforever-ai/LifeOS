import { useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { Badge, BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface, Textarea, Field, Input } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { Overlay } from '../../ui/overlay';
import { fmt, dayKey } from '../../lib/tz';
import { useToast } from '../../ui/overlay';

interface Experiment { id: string; title: string; hypothesis: string | null; duration_days: number; measures: string[] | null; status: string; started_at: string | null; conclusion: string | null }

export default function ExperimentsPage() {
  const { run } = useCore();
  const { tz } = useAuth();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [observing, setObserving] = useState<Experiment | null>(null);
  const [obsNote, setObsNote] = useState('');
  const [obsValue, setObsValue] = useState('');
  const { data, loading, error, reload } = useApi<{ items: Experiment[]; total: number }>('/e/experiments?limit=30&sort=updated_at:desc');

  const startExp = (e: Experiment) => run(() => api.post(`/experiments/${e.id}/start`), 'Experiment started');
  const completeExp = (e: Experiment) => run(() => api.post(`/experiments/${e.id}/complete`), 'Experiment completed');
  const addObs = () => {
    if (!observing) return;
    run(() => api.post('/e/experiment_observations', { experiment_id: observing.id, day: dayKey(new Date(), tz), note: obsNote, value: Number(obsValue) || null }), 'Observation recorded');
    setObsNote(''); setObsValue('');
  };

  return (
    <>
      <PageHeader eyebrow="Experiments" title="Test what works" subtitle="Question → hypothesis → measure → result → learning."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New experiment</Button>} />
      {loading && !data && <Surface><LoadingState label="Loading experiments" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && data.items.length === 0 && <Surface><EmptyState icon="flask" title="No experiments" text="Test a hypothesis about your habits or work." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New experiment</Button>} /></Surface>}
      {data && data.items.length > 0 && (
        <Surface pad="none"><ul className="list divided">
          {data.items.map((e) => (
            <li key={e.id}>
              <Row leading={<BubbleIcon name="flask" tone="plum" size="sm" />} title={e.title} subtitle={e.hypothesis?.slice(0, 100) || 'No hypothesis'}
                trailing={<Badge tone={e.status === 'running' ? 'ok' : e.status === 'completed' ? 'accent' : undefined}>{e.status}</Badge>}
                onClick={() => setObserving(e)} />
              {e.status === 'draft' && <div style={{ padding: '0 16px 12px' }}><Button size="sm" onClick={() => startExp(e)}>Start</Button></div>}
              {e.status === 'running' && <div style={{ padding: '0 16px 12px' }}><Button size="sm" onClick={() => completeExp(e)}>Complete</Button></div>}
            </li>
          ))}
        </ul></Surface>
      )}
      <EntityForm entity="experiments" open={creating} onClose={() => setCreating(false)} />
      <Overlay open={!!observing} onClose={() => setObserving(null)} title={observing?.title ?? ''} variant="dialog"
        footer={<Button onClick={() => setObserving(null)}>Close</Button>}>
        {observing && (
          <div className="detail-grid">
            {observing.hypothesis && <p className="muted">{observing.hypothesis}</p>}
            <Badge>{observing.status}</Badge>
            {observing.status === 'running' && (
              <>
                <Field label="Observation note" id="obs-note"><Textarea id="obs-note" rows={2} value={obsNote} onChange={(e) => setObsNote(e.target.value)} /></Field>
                <Field label="Value (optional)" id="obs-val"><Input id="obs-val" type="number" value={obsValue} onChange={(e) => setObsValue(e.target.value)} /></Field>
                <Button variant="primary" onClick={addObs}>Record observation</Button>
              </>
            )}
            {observing.conclusion && <><div className="caption">Conclusion</div><p>{observing.conclusion}</p></>}
          </div>
        )}
      </Overlay>
    </>
  );
}
