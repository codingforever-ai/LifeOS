import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { addDays, addMonths, dayKey, monthStartKey, weekStart } from '../../lib/tz';
import { Button, EmptyState, PageHeader, Row, Section, Surface, Tabs, Textarea, Field } from '../../ui/primitives';
import { minutesLabel } from '../../lib/tz';
import { Async, Stat, StatGrid, label } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Kind = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

function period(kind: Kind, today: string, ws: number) {
  if (kind === 'daily') return { start: today, end: today };
  if (kind === 'weekly') { const s = weekStart(today, ws); return { start: s, end: addDays(s, 6) }; }
  if (kind === 'monthly') { const s = monthStartKey(today); return { start: s, end: addDays(addMonths(s, 1), -1) }; }
  if (kind === 'quarterly') { const m = Number(today.slice(5, 7)); const qs = `${today.slice(0, 4)}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0')}-01`; return { start: qs, end: addDays(addMonths(qs, 3), -1) }; }
  return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
}
const FIELDS = [['wins', 'Wins'], ['missed', 'What fell short, and why'], ['lessons', 'Lessons'], ['decisions', 'Decisions made'], ['next', 'Next actions']] as const;

export default function ReviewPage() {
  const { tz, user } = useAuth(); const { run } = useCore();
  const [kind, setKind] = useState<Kind>('weekly'); const [answers, setAnswers] = useState<Record<string, string>>({}); const [err, setErr] = useState('');
  const today = dayKey(new Date(), tz); const p = useMemo(() => period(kind, today, user?.settings.weekStart ?? 1), [kind, today, user]);
  const facts = useApi<Rec>(`/review-facts?start=${p.start}&end=${p.end}`);
  const existing = useApi<{ items: Rec[] }>(`/e/reviews?kind=${kind}&period_start=${p.start}`);
  const past = useApi<{ items: Rec[] }>('/e/reviews?sort=period_start:desc&limit=20');
  const saved = existing.data?.items[0];
  useEffect(() => { setAnswers(saved?.answers ?? {}); setErr(''); }, [saved?.id, kind]);
  const save = async () => {
    setErr('');
    const body = { kind, period_start: p.start, period_end: p.end, answers, summary: answers.wins?.slice(0, 300) ?? '' };
    const r = await run(() => (saved ? api.patch(`/e/reviews/${saved.id}`, body) : api.post('/e/reviews', body)), 'Review saved').catch((e: ApiError) => { setErr(e.message); });
    void r;
  };
  return (
    <>
      <PageHeader eyebrow="Review" title="Look back, learn, adjust" subtitle="Facts come from your records. Your reflections are saved, and never rewritten for you." />
      <div className="toolbar"><Tabs<Kind> label="Review type" value={kind} onChange={setKind} options={(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as Kind[]).map((k) => ({ value: k, label: label(k) }))} /></div>
      <p className="faint small" style={{ marginBottom: 12 }}>{label(kind)} review · {p.start}{p.end !== p.start ? ` → ${p.end}` : ''}</p>
      <div className="split">
        <div className="stack">
          <Async q={facts} label="Collecting facts">{(f) => (<>
            <StatGrid><Stat label="Completed" value={f.completed.length} tone="ok" /><Stat label="Missed" value={f.missed.length} tone={f.missed.length ? 'warn' : undefined} /><Stat label="Focus" value={minutesLabel(f.focus.minutes)} sub={`${f.focus.sessions} sessions`} /><Stat label="Habit check-ins" value={f.habitCompletions} /><Stat label="Milestones" value={f.milestones.length} /><Stat label="Deadlines met" value={f.deadlinesMet.length} /></StatGrid>
            <Section title="Completed"><Surface pad="none">{f.completed.length ? <ul className="list divided">{f.completed.slice(0, 12).map((t: Rec) => <li key={t.id}><Row as="div" title={t.title} /></li>)}</ul> : <EmptyState icon="check" title="Nothing completed" text="No tasks were finished in this period." />}</Surface></Section>
            {f.missed.length > 0 && <Section title="Missed commitments"><Surface pad="none"><ul className="list divided">{f.missed.slice(0, 12).map((t: Rec) => <li key={t.id}><Row as="div" title={t.title} /></li>)}</ul></Surface></Section>}
            <p className="faint small">Capacity in range: {minutesLabel(f.capacity.available)} available, {minutesLabel(f.capacity.planned)} planned, {minutesLabel(f.capacity.committed)} committed.</p>
          </>)}</Async>
        </div>
        <div className="stack">
          <Section title={saved ? 'Your reflection (saved)' : 'Your reflection'}><Surface><div className="stack">
            {FIELDS.map(([k, l]) => <Field key={k} label={l} id={`rv-${k}`}><Textarea id={`rv-${k}`} rows={3} value={answers[k] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [k]: e.target.value }))} /></Field>)}
            {err && <div className="form-error" role="alert">{err}</div>}
            <Button variant="primary" onClick={save}>{saved ? 'Update review' : 'Save review'}</Button>
          </div></Surface></Section>
          <Section title="Past reviews"><Surface pad="none"><Async q={past}>{(d) => d.items.length ? <ul className="list divided">{d.items.map((r) => <li key={r.id}><Row onClick={() => { setKind(r.kind); }} title={`${label(r.kind)} · ${r.period_start}`} subtitle={r.summary || 'No summary'} /></li>)}</ul> : <EmptyState icon="eye" title="No reviews yet" text="Save your first review to start a record you can learn from." />}</Async></Surface></Section>
        </div>
      </div>
    </>
  );
}
