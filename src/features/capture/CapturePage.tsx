import { useState } from 'react';
import { useCore } from '../../core/store';
import { Alert, BubbleIcon, Button, PageHeader, Row, Section, Surface, Textarea } from '../../ui/primitives';
import type { Tone } from '../../ui/primitives';
import type { IconName } from '../../ui/Icon';
import { useToast } from '../../ui/overlay';

interface CaptureType { id: string; label: string; icon: IconName; tone: Tone; hint: string; soon?: boolean }
const TYPES: CaptureType[] = [
  { id: 'task', label: 'Task', icon: 'tasks', tone: 'purple', hint: 'Something to do' },
  { id: 'thought', label: 'Thought', icon: 'note', tone: 'royal', hint: 'A passing thought' },
  { id: 'idea', label: 'Idea', icon: 'idea', tone: 'lavender', hint: 'Something worth exploring' },
  { id: 'reminder', label: 'Reminder', icon: 'bell', tone: 'plum', hint: 'Remind me about…' },
  { id: 'note', label: 'Note', icon: 'doc', tone: 'slate', hint: 'Write something down' },
  { id: 'link', label: 'Link', icon: 'link', tone: 'mist', hint: 'Paste a URL', soon: true },
  { id: 'image', label: 'Image', icon: 'image', tone: 'sand', hint: 'Attach a photo', soon: true },
  { id: 'document', label: 'Document', icon: 'doc', tone: 'graphite', hint: 'Attach a file', soon: true },
  { id: 'voice', label: 'Voice', icon: 'mic', tone: 'graphite', hint: 'Speak it', soon: true },
];

export default function CapturePage() {
  const { addTask } = useCore();
  const toast = useToast();
  const [type, setType] = useState('task');
  const [text, setText] = useState('');
  const [recent, setRecent] = useState<{ id: number; type: string; text: string }[]>([]);
  const current = TYPES.find((t) => t.id === type)!;

  const save = () => {
    const v = text.trim();
    if (!v) return;
    if (type === 'task') addTask(v);
    setRecent((r) => [{ id: Date.now(), type: current.label, text: v }, ...r].slice(0, 5));
    setText('');
    toast(type === 'task' ? 'Task added' : `${current.label} captured (preview)`);
  };

  return (
    <>
      <PageHeader eyebrow="Capture" title="Get it out of your head" subtitle="Capture first. LifeOS will help you organise it later." />
      <div className="type-grid" role="radiogroup" aria-label="Capture type">
        {TYPES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={t.id === type} disabled={t.soon} className="type-item" onClick={() => setType(t.id)}>
            <BubbleIcon name={t.icon} tone={t.tone} />
            <span>{t.label}</span>
            {t.soon && <span className="faint soon">Soon</span>}
          </button>
        ))}
      </div>

      <Surface pad="lg" className="capture-box" tone="raised">
        <label htmlFor="cap" className="sr-only">Capture text</label>
        <Textarea id="cap" data-autofocus placeholder={current.hint} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }} />
        <div className="capture-foot">
          <span className="faint small">Ctrl/⌘ + Enter to save</span>
          <Button variant="primary" icon="check" disabled={!text.trim()} onClick={save}>Save {current.label.toLowerCase()}</Button>
        </div>
      </Surface>

      {type !== 'task' && <div style={{ marginTop: 16 }}><Alert icon="info">Only tasks are stored in Phase 1. Other capture types preview the flow and are kept for this session only.</Alert></div>}

      {recent.length > 0 && (
        <Section title="Just captured">
          <Surface pad="none"><ul className="list divided">{recent.map((r) => <li key={r.id}><Row as="div" title={r.text} subtitle={r.type} /></li>)}</ul></Surface>
        </Section>
      )}
    </>
  );
}
