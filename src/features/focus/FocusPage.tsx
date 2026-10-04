import { useEffect, useRef, useState } from 'react';
import { demoFocusHistory } from '../../data/demo';
import { Button, EmptyState, PageHeader, ProgressRing, Row, Section, Surface, Tabs, BubbleIcon } from '../../ui/primitives';
import { useToast } from '../../ui/overlay';

type Phase = 'idle' | 'running' | 'paused' | 'done';
const OPTIONS = [15, 25, 45, 60].map((m) => ({ value: String(m), label: `${m} min` }));
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Phase 1: local timer only. A real session model will come from Core later. */
export default function FocusPage() {
  const toast = useToast();
  const [minutes, setMinutes] = useState('25');
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(25 * 60);
  const [history, setHistory] = useState(demoFocusHistory);
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

  const start = () => { endAt.current = Date.now() + total * 1000; setLeft(total); setPhase('running'); };
  const pause = () => { setPhase('paused'); };
  const resume = () => { endAt.current = Date.now() + left * 1000; setPhase('running'); };
  const finish = (early: boolean) => {
    const spent = Math.max(1, Math.round((total - left) / 60));
    setHistory((h) => [{ id: `f${Date.now()}`, label: 'Focus session', minutes: early ? spent : Number(minutes), when: 'Just now' }, ...h]);
    setPhase('done');
    if (early) toast(`Session saved · ${spent} min`);
  };
  const reset = () => { setPhase('idle'); setLeft(total); };

  const shown = phase === 'idle' ? total : left;

  return (
    <>
      <PageHeader eyebrow="Focus" title="One thing, fully" subtitle="Protect a block of time for deep work." />
      <div className="focus-layout">
        <Surface pad="lg" className="focus-stage">
          {phase === 'done' ? (
            <div className="state">
              <BubbleIcon name="check" size="xl" />
              <h2>Session complete</h2>
              <p>{history[0]?.minutes} minutes of focused work, recorded to your history.</p>
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
              {history.length === 0 ? <EmptyState icon="focus" title="No sessions yet" text="Completed sessions will appear here." /> : (
                <ul className="list divided">{history.map((h) => <li key={h.id}><Row as="div" leading={<BubbleIcon name="focus" tone="graphite" size="sm" />} title={h.label} subtitle={h.when} trailing={<span className="num muted small">{h.minutes} min</span>} /></li>)}</ul>
              )}
            </Surface>
          </Section>
        </div>
      </div>
    </>
  );
}
