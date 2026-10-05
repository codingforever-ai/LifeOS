import { useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api } from '../../api/client';
import { useAuth } from '../../core/auth';
import { BubbleIcon, Button, PageHeader, Row, Section, Surface, Textarea, EmptyState, LoadingState, ErrorState, Badge } from '../../ui/primitives';
import type { IconName } from '../../ui/Icon';
import { fmt } from '../../lib/tz';
import { useToast } from '../../ui/overlay';

interface CaptureType { id: string; label: string; icon: IconName; tone: string; hint: string }
const TYPES: CaptureType[] = [
  { id: 'task', label: 'Task', icon: 'tasks', tone: 'purple', hint: 'Something to do' },
  { id: 'thought', label: 'Thought', icon: 'note', tone: 'royal', hint: 'A passing thought' },
  { id: 'idea', label: 'Idea', icon: 'idea', tone: 'lavender', hint: 'Something worth exploring' },
  { id: 'reminder', label: 'Reminder', icon: 'bell', tone: 'plum', hint: 'Remind me about…' },
  { id: 'note', label: 'Note', icon: 'doc', tone: 'slate', hint: 'Write something down' },
  { id: 'link', label: 'Link', icon: 'link', tone: 'mist', hint: 'Paste a URL' },
];

interface InboxItem { id: string; kind: string; content: string; url: string | null; status: string; created_at: string }

export default function CapturePage() {
  const { run, bump } = useCore();
  const toast = useToast();
  const { tz } = useAuth();
  const [type, setType] = useState('task');
  const [text, setText] = useState('');
  const { data, loading, error, reload } = useApi<{ items: InboxItem[]; total: number }>('/e/inbox?limit=20&sort=created_at:desc');

  const save = () => {
    const v = text.trim();
    if (!v) return;
    run(() => api.post('/e/inbox', { kind: type, content: v }), 'Captured');
    setText('');
  };

  return (
    <>
      <PageHeader eyebrow="Capture" title="Get it out of your head" subtitle="Capture first. The Agent can process your inbox later." />
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
        <Textarea id="cap" data-autofocus placeholder={TYPES.find((t) => t.id === type)?.hint} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }} />
        <div className="capture-foot">
          <span className="faint small">Ctrl/⌘ + Enter to save</span>
          <Button variant="primary" icon="check" disabled={!text.trim()} onClick={save}>Save</Button>
        </div>
      </Surface>

      <Section title="Inbox">
        {loading && !data && <Surface><LoadingState label="Loading inbox" /></Surface>}
        {error && <Surface><ErrorState text={error} onRetry={reload} /></Surface>}
        {data && data.items.length === 0 && <Surface><EmptyState icon="inbox" title="Inbox is empty" text="Captured items will appear here for the Agent to process." /></Surface>}
        {data && data.items.length > 0 && (
          <Surface pad="none"><ul className="list divided">
            {data.items.map((item) => (
              <li key={item.id}><Row as="div"
                leading={<BubbleIcon name={TYPES.find((t) => t.id === item.kind)?.icon ?? 'note'} tone={TYPES.find((t) => t.id === item.kind)?.tone ?? 'graphite'} size="sm" />}
                title={item.content}
                subtitle={`${item.kind} · ${fmt.dateTime(item.created_at, tz)}`}
                trailing={item.status !== 'new' ? <Badge>{item.status}</Badge> : undefined}
              /></li>
            ))}
          </ul></Surface>
        )}
      </Section>
    </>
  );
}
