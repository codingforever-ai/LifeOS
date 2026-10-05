import { useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, Surface, Textarea, Field } from '../../ui/primitives';
import { EntityForm } from '../../ui/EntityForm';
import { dayKey, fmt, minutesLabel } from '../../lib/tz';

interface Experiment { id: string; title: string; hypothesis: string | null; duration_days: number; measures: string[] | null; status: string; started_at: string | null; conclusion: string | null }
interface ExpResults {
  experiment: Experiment; daysElapsed: number; ends: string | null;
  measured: { focusMinutes: number; focusSessions: number; tasksCompleted: number };
  observations: number; series: Record<string, { n: number; mean: number; min: number; max: number }>;
  note: string;
}

export default function ExperimentsPage() {
  const { run } = useCore();
  const { tz } = useAuth();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Experiment | null>(null);
  const [obsNote, setObsNote] = useState('');
  const [obsValue, setObsValue] = useState('');
  const [conclusion, setConclusion] = useState('');
  const { data, loading, error, reload } = useApi<{ items: Experiment[]; total: number }>('/e/experiments?limit=30&sort=updated_at:desc');
  const { data: results } = useApi<ExpResults>(viewing ? `/experiments/${viewing.id}/results` : null);

  const startExp = (e: Experiment) => run(() => api.post(`/experiments/${e.id}/start`), 'Experiment started');
  const completeExp = (e: Experiment) => {
    if (!conclusion.trim()) { run(() => api.post(`/experiments/${e.id}/complete`, { conclusion }), 'Experiment completed'); }
    else { run(() => api.post(`/experiments/${e.id}/complete`, { conclusion }), 'Experiment completed'); }
    setConclusion('');
  };
  const addObs = () => {
    if (!viewing) return;
    run(() => api.post('/e/experiment_observations', { experiment_id: viewing.id, day: dayKey(new Date(), tz), note: obsNote, value: Number(obsValue) || null }), 'Observation recorded');
    setObsNote(''); setObsValue('');
  };

  const experiments = data?.items ?? [];

  return (
    <>
      <PageHeader eyebrow="Experiments" title="Test what works" subtitle="Hypothesis → Change → Duration → Measurement → Result → Learning. Scientific, not theatrical."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New experiment</Button>} />

      {loading && !data && <Surface><LoadingState label="Loading experiments" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {data && experiments.length === 0 && <Surface><EmptyState icon="flask" title="No experiments" text="Test a hypothesis about your habits or work. What would you like to learn?" action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New experiment</Button>} /></Surface>}

      {data && experiments.length > 0 && (
        <div className="exp-list">
          {experiments.map((e) => (
            <Surface key={e.id} className="exp-card" pad="md">
              <div className="exp-head">
                <div>
                  <div className="exp-title">{e.title}</div>
                  {e.hypothesis && <p className="muted small" style={{ marginTop: 4 }}>{e.hypothesis}</p>}
                </div>
                <Badge tone={e.status === 'running' ? 'ok' : e.status === 'completed' ? 'accent' : undefined}>{e.status}</Badge>
              </div>
              <div className="exp-flow">
                <div className="exp-step"><span className="caption">Duration</span><span className="small">{e.duration_days} days</span></div>
                {e.measures && e.measures.length > 0 && <div className="exp-step"><span className="caption">Measures</span><span className="small">{e.measures.join(', ')}</span></div>}
                {e.started_at && <div className="exp-step"><span className="caption">Started</span><span className="small">{fmt.date(e.started_at, tz)}</span></div>}
                {e.conclusion && <div className="exp-step" style={{ borderLeft: '2px solid var(--accent)' }}><span className="caption" style={{ color: 'var(--accent-lavender)' }}>Learning</span><span className="small">{e.conclusion}</span></div>}
              </div>
              <div className="exp-actions">
                <Button size="sm" variant="ghost" onClick={() => setViewing(e)}>Details</Button>
                {e.status === 'draft' && <Button size="sm" variant="primary" onClick={() => startExp(e)}>Start</Button>}
                {e.status === 'running' && <Button size="sm" onClick={() => completeExp(e)}>Complete</Button>}
              </div>
            </Surface>
          ))}
        </div>
      )}

      <EntityForm entity="experiments" open={creating} onClose={() => setCreating(false)} />

      {viewing && (
        <div className="overlay-backdrop" onClick={() => setViewing(null)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h3 style={{ fontSize: 'var(--fs-body)', fontWeight: 600 }}>{viewing.title}</h3>
              <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </div>
            <div style={{ padding: '0 var(--s6) var(--s6)', maxHeight: '70vh', overflowY: 'auto' }}>
              {viewing.hypothesis && <p className="muted" style={{ marginBottom: 'var(--s4)' }}>{viewing.hypothesis}</p>}

              {results && (
                <>
                  <div className="exp-results-grid">
                    <div className="exp-result-stat">
                      <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{results.daysElapsed}</div>
                      <div className="muted small">of {viewing.duration_days} days</div>
                    </div>
                    <div className="exp-result-stat">
                      <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{minutesLabel(results.measured.focusMinutes)}</div>
                      <div className="muted small">focus time</div>
                    </div>
                    <div className="exp-result-stat">
                      <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{results.measured.tasksCompleted}</div>
                      <div className="muted small">tasks done</div>
                    </div>
                    <div className="exp-result-stat">
                      <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{results.observations}</div>
                      <div className="muted small">observations</div>
                    </div>
                  </div>

                  {Object.keys(results.series).length > 0 && (
                    <div style={{ marginTop: 'var(--s5)' }}>
                      <div className="caption" style={{ marginBottom: 'var(--s3)' }}>Measured series</div>
                      {Object.entries(results.series).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--fs-small)' }}>
                          <span>{k}</span>
                          <span className="num muted">n={v.n} · mean {v.mean.toFixed(1)} · range {v.min}–{v.max}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="alert" data-tone="accent" style={{ marginTop: 'var(--s5)' }}>
                    <span className="small">{results.note}</span>
                  </div>
                </>
              )}

              {viewing.status === 'running' && (
                <div style={{ marginTop: 'var(--s5)' }}>
                  <div className="caption" style={{ marginBottom: 'var(--s3)' }}>Record observation</div>
                  <Field label="Note" id="obs-note"><Textarea id="obs-note" rows={2} value={obsNote} onChange={(e) => setObsNote(e.target.value)} /></Field>
                  <Field label="Value (optional)" id="obs-val"><input id="obs-val" className="input" type="number" value={obsValue} onChange={(e) => setObsValue(e.target.value)} /></Field>
                  <Button variant="primary" onClick={addObs} style={{ marginTop: 'var(--s3)' }}>Record observation</Button>
                </div>
              )}

              {viewing.status === 'running' && (
                <div style={{ marginTop: 'var(--s5)' }}>
                  <div className="caption" style={{ marginBottom: 'var(--s3)' }}>Complete with learning</div>
                  <Field label="What did you learn?" id="exp-conclusion"><Textarea id="exp-conclusion" rows={3} value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="What did this experiment teach you?" /></Field>
                  <Button variant="primary" onClick={() => completeExp(viewing)} style={{ marginTop: 'var(--s3)' }}>Complete experiment</Button>
                </div>
              )}

              {viewing.conclusion && (
                <div style={{ marginTop: 'var(--s5)', borderLeft: '2px solid var(--accent)', paddingLeft: 'var(--s4)' }}>
                  <div className="caption" style={{ color: 'var(--accent-lavender)', marginBottom: 'var(--s2)' }}>Learning</div>
                  <p className="small">{viewing.conclusion}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
