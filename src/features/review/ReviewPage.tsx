import { useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { BubbleIcon, Button, EmptyState, LoadingState, ErrorState, PageHeader, Row, Surface, Textarea, Field } from '../../ui/primitives';
import { Overlay } from '../../ui/overlay';
import { dayKey, addDays, fmt, minutesLabel } from '../../lib/tz';
import { useToast } from '../../ui/overlay';

interface Review { id: string; kind: string; period_start: string; period_end: string; answers: Record<string, string>; summary: string | null; created_at: string }
interface ReviewFacts { tasksCompleted: number; tasksCreated: number; focusMinutes: number; habitsDone: number; deadlinesHit: number; deadlinesMissed: number; topDomains: { domain: string; minutes: number }[] }

const QUESTIONS = ['What happened?', 'What worked?', 'What didn\'t?', 'What surprised me?', 'What should change?', 'What should continue?'];

export default function ReviewPage() {
  const { run } = useCore();
  const { tz } = useAuth();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState('weekly');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<Review | null>(null);
  const today = dayKey(new Date(), tz);
  const start = kind === 'daily' ? today : kind === 'weekly' ? addDays(today, -7) : addDays(today, -30);
  const { data: facts, loading: fLoading } = useApi<ReviewFacts>(`/review-facts?start=${start}&end=${today}`);
  const { data: reviews, loading, error, reload } = useApi<{ items: Review[]; total: number }>('/e/reviews?limit=20&sort=created_at:desc');

  const save = async () => {
    const filled = Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim()));
    if (Object.keys(filled).length === 0) { toast('Answer at least one question.'); return; }
    run(() => api.post('/e/reviews', { kind, period_start: start, period_end: today, answers: filled }), 'Review saved');
    setCreating(false); setAnswers({});
  };

  return (
    <>
      <PageHeader eyebrow="Review" title="Reflect and learn" subtitle="Look back to plan forward. Connected to your timeline, goals, and accomplishments."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New review</Button>} />

      {loading && !reviews && <Surface><LoadingState label="Loading reviews" /></Surface>}
      {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
      {reviews && reviews.items.length === 0 && <Surface><EmptyState icon="history" title="No reviews yet" text="Start a daily, weekly, or monthly review. Your period summary is pulled from real records." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New review</Button>} /></Surface>}

      {reviews && reviews.items.length > 0 && (
        <Surface pad="none"><ul className="list divided">
          {reviews.items.map((r) => (
            <li key={r.id}><Row as="div"
              leading={<BubbleIcon name="history" tone="lavender" size="sm" />}
              title={`${r.kind} · ${r.period_start} to ${r.period_end}`}
              subtitle={r.summary || Object.values(r.answers).join(' ').slice(0, 120) || 'No summary'}
              trailing={<Button size="sm" variant="ghost" onClick={() => setViewing(r)}>View</Button>}
            /></li>
          ))}
        </ul></Surface>
      )}

      <Overlay open={creating} onClose={() => setCreating(false)} title="New review" variant="dialog"
        footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" onClick={save}>Save review</Button></>}>
        <div className="detail-grid">
          <Field label="Type" id="rv-kind"><select id="rv-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></Field>

          {facts && !fLoading && (
            <Surface>
              <div className="caption">Period summary · {start} to {today}</div>
              <div className="review-facts">
                <div className="review-fact"><span className="num">{facts.tasksCompleted}</span><span className="muted small">tasks done</span></div>
                <div className="review-fact"><span className="num">{facts.tasksCreated}</span><span className="muted small">tasks created</span></div>
                <div className="review-fact"><span className="num">{minutesLabel(facts.focusMinutes)}</span><span className="muted small">focus</span></div>
                <div className="review-fact"><span className="num">{facts.habitsDone}</span><span className="muted small">habits</span></div>
                <div className="review-fact"><span className="num">{facts.deadlinesHit}</span><span className="muted small">deadlines hit</span></div>
                <div className="review-fact"><span className="num" style={{ color: facts.deadlinesMissed ? 'var(--danger)' : undefined }}>{facts.deadlinesMissed}</span><span className="muted small">missed</span></div>
              </div>
              {facts.topDomains.length > 0 && (
                <div style={{ marginTop: 'var(--s3)' }}>
                  <div className="caption" style={{ marginBottom: 4 }}>Top domains</div>
                  <p className="muted small">{facts.topDomains.map((d) => `${d.domain}: ${minutesLabel(d.minutes)}`).join(' · ')}</p>
                </div>
              )}
            </Surface>
          )}

          {QUESTIONS.map((q) => <Field key={q} label={q} id={`rv-${q}`}><Textarea id={`rv-${q}`} rows={2} value={answers[q] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q]: e.target.value }))} /></Field>)}
        </div>
      </Overlay>

      {viewing && (
        <div className="overlay-backdrop" onClick={() => setViewing(null)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h3 style={{ fontSize: 'var(--fs-body)', fontWeight: 600 }}>{viewing.kind} review · {viewing.period_start} to {viewing.period_end}</h3>
              <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </div>
            <div style={{ padding: '0 var(--s6) var(--s6)', maxHeight: '70vh', overflowY: 'auto' }}>
              {Object.entries(viewing.answers).map(([q, a]) => (
                <div key={q} style={{ marginBottom: 'var(--s4)' }}>
                  <div className="caption" style={{ marginBottom: 4 }}>{q}</div>
                  <p className="small">{a}</p>
                </div>
              ))}
              {viewing.summary && <><div className="caption" style={{ marginTop: 'var(--s4)', marginBottom: 4 }}>Summary</div><p className="small">{viewing.summary}</p></>}
              <div className="facts" style={{ marginTop: 'var(--s5)' }}>
                <dt>Recorded</dt><dd>{fmt.dateTime(viewing.created_at, tz)}</dd>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
