import { useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { Badge, BubbleIcon, Button, EmptyState, ErrorState, LoadingState, PageHeader, Row, Section, Surface, Textarea } from '../../ui/primitives';
import type { IconName } from '../../ui/Icon';
import { fmt } from '../../lib/tz';

interface CaptureType { id: string; label: string; icon: IconName; tone: string; hint: string; convertsTo?: string }
const TYPES: CaptureType[] = [
  { id: 'task', label: 'Task', icon: 'tasks', tone: 'purple', hint: 'Something to do', convertsTo: 'task' },
  { id: 'deadline', label: 'Deadline', icon: 'flag', tone: 'plum', hint: 'A hard due date', convertsTo: 'deadline' },
  { id: 'event', label: 'Event', icon: 'calendar', tone: 'slate', hint: 'Something scheduled', convertsTo: 'event' },
  { id: 'goal', label: 'Goal', icon: 'goals', tone: 'royal', hint: 'Something to achieve', convertsTo: 'goal' },
  { id: 'idea', label: 'Idea', icon: 'idea', tone: 'lavender', hint: 'Something worth exploring' },
  { id: 'decision', label: 'Decision', icon: 'compass', tone: 'sand', hint: 'A choice to record', convertsTo: 'decision' },
  { id: 'memory', label: 'Memory', icon: 'brain', tone: 'lavender', hint: 'Something to remember', convertsTo: 'memory' },
  { id: 'note', label: 'Note', icon: 'note', tone: 'graphite', hint: 'Write something down' },
  { id: 'reminder', label: 'Reminder', icon: 'bell', tone: 'mist', hint: 'Remind me about…' },
  { id: 'link', label: 'Link', icon: 'link', tone: 'mist', hint: 'Paste a URL' },
];

interface InboxItem { id: string; kind: string; content: string; url: string | null; status: string; resolved_type: string | null; created_at: string }

export default function CapturePage() {
  const { run } = useCore();
  const { tz } = useAuth();
  const [type, setType] = useState('task');
  const [text, setText] = useState('');
  const { data, loading, error, reload } = useApi<{ items: InboxItem[]; total: number }>('/e/inbox?limit=30&sort=created_at:desc');

  const save = () => {
    const v = text.trim();
    if (!v) return;
    run(() => api.post('/e/inbox', { kind: type, content: v }), 'Captured');
    setText('');
  };

  const convert = (item: InboxItem, as: string) => {
    run(() => api.post(`/inbox/${item.id}/convert`, { as }), `Converted to ${as}`);
  };

  const typeDef = TYPES.find((t) => t.id === type);

  return (
    <>
      <PageHeader eyebrow="Capture" title="Get it out of your head" subtitle="Capture first — raw thought becomes a structured LifeOS object. AI can enhance later, but capture always works." />

      <div className="type-grid" role="radiogroup" aria-label="Capture type">
        {TYPES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={t.id === type} className="type-item" onClick={() => setType(t.id)}>
            <BubbleIcon name={t.icon} tone={t.tone} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <Surface pad="lg" className="capture-box" tone="raised">
        <label htmlFor="cap" className="sr-only">Capture text</label>
        <Textarea id="cap" data-autofocus placeholder={typeDef?.hint} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }} />
        <div className="capture-foot">
          <span className="faint small">Ctrl/⌘ + Enter to save · {typeDef?.label}</span>
          <Button variant="primary" icon="check" disabled={!text.trim()} onClick={save}>Save</Button>
        </div>
      </Surface>

      <Section title="Inbox">
        {loading && !data && <Surface><LoadingState label="Loading inbox" /></Surface>}
        {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
        {data && data.items.length === 0 && <Surface><EmptyState icon="inbox" title="Inbox is empty" text="Captured items appear here. Convert them into tasks, goals, deadlines, decisions, or memories." /></Surface>}
        {data && data.items.length > 0 && (
          <Surface pad="none"><ul className="list divided">
            {data.items.map((item) => {
              const td = TYPES.find((t) => t.id === item.kind);
              return (
                <li key={item.id}>
                  <Row as="div"
                    leading={<BubbleIcon name={td?.icon ?? 'note'} tone={td?.tone ?? 'graphite'} size="sm" />}
                    title={item.content}
                    subtitle={`${item.kind} · ${fmt.dateTime(item.created_at, tz)}`}
                    trailing={
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {item.status === 'processed' && item.resolved_type && <Badge tone="ok">→ {item.resolved_type}</Badge>}
                        {item.status === 'new' && td?.convertsTo && (
                          <Button size="sm" variant="ghost" onClick={() => convert(item, td.convertsTo!)}>→ {td.convertsTo}</Button>
                        )}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul></Surface>
        )}
      </Section>
    </>
  );
}
