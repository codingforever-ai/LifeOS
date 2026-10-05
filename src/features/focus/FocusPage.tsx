import { useEffect, useRef, useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { api } from '../../api/client';
import { fmt, minutesLabel } from '../../lib/tz';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, ProgressRing, Row, Section, Surface, Tabs, BubbleIcon } from '../../ui/primitives';
import { useToast } from '../../ui/overlay';

type Phase = 'idle' | 'running' | 'paused' | 'done';
const OPTIONS = [15, 25, 45, 60].map((m) => ({ value: String(m), label: `${m} min` }));
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

interface FocusData {
  current: { id: string; planned_min: number; accumulated_ms: number; running_since: string | null; status: string; task_id: string | null; note: string | null } | null;
  serverNow: string;
  history: { id: string; started_at: string; planned_min: number; accumulated_ms: number; status: string; task_id: string | null; note: string | null }[];
  byDay: { day: string; minutes: number }[];
  totalMinutes: number;
  sessions: number;
}

export default function FocusPage() {
  const { tz } = useAuth();
  const { run } = useCore();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<FocusData>('/focus');
  const [minutes, setMinutes] = useState('25');
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(25 * 60);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endAt = useRef(0);
  const total = Number(minutes) * 60;

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) setPhase('done');
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  const start = async () => {
    try {
      const r = await api.post<{ id: string }>('/focus', { planned_min: Number(minutes) });
      setSessionId(r.id);
      endAt.current = Date.now() + total * 1000;
      setLeft(total);
      setPhase('running');
    } catch { toast('Could not start session'); }
  };

  const pause = async () => {
    if (sessionId) await run(() => api.post(`/focus/${sessionId}/pause`), 'Paused');
    setPhase('paused');
  };

  const resume = async () => {
    if (sessionId) await run(() => api.post(`/focus/${sessionId}/resume`), 'Resumed');
    endAt.current = Date.now() + left * 1000;
    setPhase('running');
  };

  const finish = async (early: boolean) => {
    if (sessionId) {
      await run(() => api.post(`/focus/${sessionId}/stop`), early ? 'Session saved' : 'Session complete');
    }
    setPhase('done');
  };

  const reset = () => { setPhase('idle'); setLeft(total); setSessionId(null); reload(); };
  const shown = phase === 'idle' ? total : left;

  if (loading && !data) return <div style={{ padding: 32 }}><LoadingState rows={3} /></div>;
  if (error && !data) return <ErrorState text={error} onRetry={reload} />;

  return (
    <>
      <PageHeader eyebrow="Focus" title="One thing, fully" subtitle="Protect a block of time for deep work." />
      <div className="focus-layout">
        <Surface pad="lg" className="focus-stage">
          {phase === 'done' ? (
            <div className="state">
              <BubbleIcon name="check" size="xl" />
              <h2>Session complete</h2>
              <p>{Math.round((total - left) / 60)} minutes of focused work, recorded to your history.</p>
              <Button variant="primary" onClick={reset}>Start another</Button>
            </div>
          ) : (
            <>
              <div className="focus-ring">
                <ProgressRing value={phase === 'idle' ? 0 : 1 - left / total} size={240} label="Session progress"><span className="focus-time num">{mmss(shown)}</span></ProgressRing>
              </div>
              {phase === 'idle' ? (
                <>
                  <Tabs label="Session length" value={minutes} onChange={(v) => { setMinutes(v); setLeft(Number(v) * 60); }} options={OPTIONS} />
                  <Button variant="primary" icon="play" onClick={start}>Start session</Button>
                </>
              ) : (
                <div className="focus-actions">
                  {phase === 'running' ? <Button icon="pause" onClick={pause}>Pause</Button> : <Button variant="primary" icon="play" onClick={resume}>Resume</Button>}
                  <Button variant="ghost" onClick={() => finish(true)}>Finish early</Button>
                </div>
              )}
              <p className="faint small" aria-live="polite">{phase === 'running' ? 'In session' : phase === 'paused' ? 'Paused' : 'Ready when you are'}</p>
            </>
          )}
        </Surface>

        <div>
          <Section title="Recent sessions">
            <Surface pad="none">
              {data && data.history.length === 0 ? <EmptyState icon="focus" title="No sessions yet" text="Completed sessions will appear here." /> : (
                <ul className="list divided">
                  {data?.history.map((h) => (
                    <li key={h.id}><Row as="div" leading={<BubbleIcon name="focus" tone="graphite" size="sm" />} title={h.note ?? 'Focus session'} subtitle={fmt.dateTime(h.started_at, tz)} trailing={<span className="num muted small">{minutesLabel(h.accumulated_ms / 60000)}</span>} /></li>
                  ))}
                </ul>
              )}
            </Surface>
          </Section>
          {data && data.sessions > 0 && (
            <Section title="Total">
              <Surface><p className="num" style={{ fontSize: '1.5rem' }}>{minutesLabel(data.totalMinutes)}</p><p className="muted small">{data.sessions} sessions</p></Surface>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
