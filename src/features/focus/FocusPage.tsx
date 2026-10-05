import { useEffect, useRef, useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { Button, EmptyState, PageHeader, ProgressRing, Row, Section, Surface, Tabs, BubbleIcon, LoadingState, ErrorState } from '../../ui/primitives';
import { fmt, minutesLabel } from '../../lib/tz';

interface FocusSession { id: string; task_id: string | null; project_id: string | null; goal_id: string | null; domain: string | null; planned_min: number; started_at: string; ended_at: string | null; accumulated_ms: number; running_since: string | null; status: string; note: string | null }
interface FocusData { current: FocusSession | null; serverNow: string; history: FocusSession[]; byDay: { day: string; minutes: number }[]; totalMinutes: number; sessions: number }

type Phase = 'idle' | 'running' | 'paused' | 'done';
const OPTIONS = [15, 25, 45, 60].map((m) => ({ value: String(m), label: `${m} min` }));
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function FocusPage() {
  const { run } = useCore();
  const { tz } = useAuth();
  const { data, loading, error, reload } = useApi<FocusData>('/focus');
  const [minutes, setMinutes] = useState('25');
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(25 * 60);
  const total = Number(minutes) * 60;
  const endAt = useRef(0);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) setPhase('done');
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  const start = () => {
    run(async () => {
      const s = await api.post<FocusSession>('/focus', { planned_min: Number(minutes) });
      endAt.current = Date.now() + total * 1000; setLeft(total); setPhase('running');
      return s;
    }, 'Focus session started');
  };
  const pause = () => { run(() => api.post(`/focus/${data?.current?.id}/pause`), 'Paused'); setPhase('paused'); };
  const resume = () => { run(() => api.post(`/focus/${data?.current?.id}/resume`), 'Resumed'); endAt.current = Date.now() + left * 1000; setPhase('running'); };
  const finish = () => { run(() => api.post(`/focus/${data?.current?.id}/stop`), 'Session saved'); setPhase('done'); };
  const reset = () => { setPhase('idle'); setLeft(total); reload(); };

  const shown = phase === 'idle' ? total : left;
  const history = data?.history ?? [];

  if (loading && !data) return <div style={{ padding: 24 }}><LoadingState label="Loading focus" /></div>;
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
              <p>{data?.current?.planned_min ?? Number(minutes)} minutes of focused work, recorded to your history.</p>
              <Button variant="primary" onClick={reset}>Start another</Button>
            </div>
          ) : data?.current && phase !== 'idle' ? (
            <>
              <div className="focus-ring">
                <ProgressRing value={1 - left / total} size={240} label="Session progress"><span className="focus-time num">{mmss(shown)}</span></ProgressRing>
              </div>
              <div className="focus-actions">
                {phase === 'running' ? <Button icon="pause" onClick={pause}>Pause</Button> : <Button variant="primary" icon="play" onClick={resume}>Resume</Button>}
                <Button variant="ghost" onClick={finish}>Finish</Button>
              </div>
              <p className="faint small" aria-live="polite">{phase === 'running' ? 'In session' : 'Paused'}</p>
            </>
          ) : (
            <>
              <div className="focus-ring">
                <ProgressRing value={0} size={240} label="Session progress"><span className="focus-time num">{mmss(total)}</span></ProgressRing>
              </div>
              <Tabs label="Session length" value={minutes} onChange={(v) => { setMinutes(v); setLeft(Number(v) * 60); }} options={OPTIONS} />
              <Button variant="primary" icon="play" onClick={start}>Start session</Button>
              <p className="faint small">Ready when you are</p>
            </>
          )}
        </Surface>

        <div>
          <Section title="Recent sessions">
            <Surface pad="none">
              {history.length === 0 ? <EmptyState icon="focus" title="No sessions yet" text="Completed sessions will appear here." /> : (
                <ul className="list divided">{history.map((h) => {
                  const mins = Math.round((h.accumulated_ms || (h.ended_at ? new Date(h.ended_at).getTime() - new Date(h.started_at).getTime() : 0)) / 60000);
                  return <li key={h.id}><Row as="div" leading={<BubbleIcon name="focus" tone="graphite" size="sm" />} title={h.note || 'Focus session'} subtitle={fmt.dateTime(h.started_at, tz)} trailing={<span className="num muted small">{minutesLabel(mins)}</span>} /></li>;
                })}</ul>
              )}
            </Surface>
          </Section>
          {data && data.totalMinutes > 0 && (
            <Section title="Total">
              <Surface><p className="num" style={{ fontSize: '1.5rem' }}>{minutesLabel(data.totalMinutes)}</p><p className="muted small">across {data.sessions} sessions</p></Surface>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
