import { useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { useAuth } from '../../core/auth';
import { domainOptions } from '../../core/domains';
import { inputToIso } from '../../lib/tz';
import { Badge, BubbleIcon, Button, EmptyState, Field, Input, PageHeader, Row, Surface, Textarea } from '../../ui/primitives';
import type { Tone } from '../../ui/primitives';
import type { IconName } from '../../ui/Icon';
import { Async, label } from '../common/kit';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const TYPES: { id: string; label: string; icon: IconName; tone: Tone; hint: string }[] = [
  { id: 'thought', label: 'Thought', icon: 'note', tone: 'royal', hint: 'A passing thought' }, { id: 'task', label: 'Task', icon: 'tasks', tone: 'purple', hint: 'Something to do' },
  { id: 'idea', label: 'Idea', icon: 'idea', tone: 'lavender', hint: 'Something worth exploring' }, { id: 'note', label: 'Note', icon: 'doc', tone: 'slate', hint: 'Write something down' },
  { id: 'deadline', label: 'Deadline', icon: 'clock', tone: 'plum', hint: 'Something due' }, { id: 'event', label: 'Event', icon: 'calendar', tone: 'slate', hint: 'Something happening' },
  { id: 'goal', label: 'Goal idea', icon: 'goals', tone: 'royal', hint: 'An outcome to pursue' }, { id: 'project', label: 'Project idea', icon: 'projects', tone: 'royal', hint: 'A body of work' },
  { id: 'decision', label: 'Decision', icon: 'target', tone: 'sand', hint: 'A choice to record' }, { id: 'reflection', label: 'Reflection', icon: 'eye', tone: 'plum', hint: 'What you noticed' },
  { id: 'memory', label: 'Memory', icon: 'brain', tone: 'lavender', hint: 'Something to remember' }, { id: 'resource', label: 'Resource', icon: 'book', tone: 'mist', hint: 'Something useful' },
  { id: 'link', label: 'Link', icon: 'link', tone: 'mist', hint: 'Paste a URL' }, { id: 'commitment', label: 'Commitment', icon: 'flag', tone: 'sand', hint: 'A promise you made' },
];
const CONVERT = ['task', 'note', 'deadline', 'event', 'project', 'goal', 'decision', 'memory'];

export default function CapturePage() {
  const { run } = useCore(); const { tz } = useAuth();
  const [type, setType] = useState('thought'); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [tags, setTags] = useState(''); const [domain, setDomain] = useState(''); const [when, setWhen] = useState(''); const [url, setUrl] = useState(''); const [err, setErr] = useState('');
  const inbox = useApi<{ items: Rec[]; total: number }>('/e/inbox?status=new&limit=50&sort=created_at:desc');
  const current = TYPES.find((t) => t.id === type)!;
  const save = async () => {
    const content = (body || title).trim(); if (!content) return; setErr('');
    const t = tags.split(',').map((x) => x.trim()).filter(Boolean);
    const r = await run(() => api.post('/e/inbox', { kind: type, content, ...(title && body ? { title } : {}), ...(t.length ? { tags: t } : {}), ...(domain ? { domain } : {}), ...(when ? { due_at: inputToIso(when, tz) } : {}), ...(url ? { url } : {}), source: 'capture' }), 'Captured').catch((e: ApiError) => setErr(e.message));
    if (r !== undefined) { setTitle(''); setBody(''); setTags(''); setWhen(''); setUrl(''); }
  };
  const convert = (id: string, as: string) => run(() => api.post(`/inbox/${id}/convert`, { as }), as === 'dismiss' ? 'Dismissed' : `Converted to ${as}`);
  return (
    <>
      <PageHeader eyebrow="Capture" title="Get it out of your head" subtitle="Capture first. Classify and convert it into structured LifeOS records when you’re ready." />
      <div className="type-grid" role="radiogroup" aria-label="Capture type">
        {TYPES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={t.id === type} className="type-item" onClick={() => setType(t.id)}><BubbleIcon name={t.icon} tone={t.tone} /><span>{t.label}</span></button>)}
      </div>
      <Surface pad="lg" className="capture-box" tone="raised">
        <div className="stack">
          <Field label="Title (optional)" id="cap-title"><Input id="cap-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label={current.label} id="cap"><Textarea id="cap" data-autofocus placeholder={current.hint} value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }} /></Field>
          {type === 'link' && <Field label="URL" id="cap-url"><Input id="cap-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>}
          <div className="form-grid">
            <Field label="Domain" id="cap-dom"><select id="cap-dom" className="input" value={domain} onChange={(e) => setDomain(e.target.value)}><option value="">—</option>{domainOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
            <Field label="Tags (comma separated)" id="cap-tags"><Input id="cap-tags" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
            <Field label="Date / time" id="cap-when"><Input id="cap-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          </div>
          {err && <div className="form-error" role="alert">{err}</div>}
        </div>
        <div className="capture-foot"><span className="faint small">Ctrl/⌘ + Enter to save</span><Button variant="primary" icon="check" disabled={!(body || title).trim()} onClick={save}>Save {current.label.toLowerCase()}</Button></div>
      </Surface>
      <h2 className="caption" style={{ margin: '24px 0 8px' }}>Inbox</h2>
      <Async q={inbox} label="Loading inbox">{(d) => (
        <Surface pad="none">{d.items.length === 0 ? <EmptyState icon="inbox" title="Inbox zero" text="Everything captured has been organised." /> : (
          <ul className="list divided">{d.items.map((i) => (
            <li key={i.id}><Row as="div" title={i.title || i.content} subtitle={<>{label(i.kind)}{i.domain ? ` · ${label(i.domain)}` : ''}{Array.isArray(i.tags) ? ` · #${i.tags.join(' #')}` : ''}</>} trailing={
              <span className="field-inline"><select className="input compact" aria-label={`Convert ${i.title || i.content}`} value="" onChange={(e) => e.target.value && convert(i.id, e.target.value)}><option value="">Convert to…</option>{CONVERT.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select><Button size="sm" variant="ghost" onClick={() => convert(i.id, 'dismiss')}>Dismiss</Button></span>} />
              {i.kind && <Badge>{label(i.kind)}</Badge>}</li>))}</ul>)}</Surface>)}</Async>
    </>
  );
}
