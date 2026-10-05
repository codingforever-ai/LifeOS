import { useEffect, useRef, useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api, streamAgent, type AgentEvent, type AgentAction } from '../../api/client';
import { Alert, Badge, BubbleIcon, Button, IconButton, Surface, LoadingState, ErrorState } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { VisualBlockRenderer, type VisualBlock } from './visuals';
import './agent.css';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  steps: { label: string; status: string }[];
  action: AgentAction | null;
  failed: boolean;
  visuals: VisualBlock[];
}
interface Status {
  configured: boolean;
  byok: boolean;
  provider: string;
  model: string | null;
  keyHint: string | null;
  enabled: boolean;
  quota: { used: number; limit: number };
}

const SUGGESTIONS = [
  'Plan my afternoon 📅',
  'What should I focus on today? 🎯',
  'What am I behind on? ⚠️',
  'Create a task to review the design tomorrow at 10 AM 📝',
];

export default function AgentPage() {
  const { bump } = useCore();
  const { data: status, loading, error, reload } = useApi<Status>('/agent/status');
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusLabel, setStatusLabel] = useState('Thinking');
  const end = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  const send = async (prompt: string) => {
    const p = prompt.trim();
    if (!p || busy) return;
    setText('');
    setBusy(true);
    setStatusLabel('Thinking');
    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', text: p, steps: [], action: null, failed: false, visuals: [] };
    setMsgs((m) => [...m, userMsg]);

    const ac = new AbortController();
    abortRef.current = ac;
    let curSteps: { label: string; status: string }[] = [];

    streamAgent(p, undefined, (e: AgentEvent) => {
      if (e.type === 'conversation') { /* conversation id */ }
      else if (e.type === 'thinking' && e.label) {
        setStatusLabel(e.label);
      }
      else if (e.type === 'step') {
        curSteps = [...curSteps, { label: e.label, status: e.status }];
        setMsgs((m) => m.map((x) => x.id === userMsg.id ? { ...x, steps: curSteps } : x));
      }
      else if (e.type === 'done') {
        // Build visual blocks from action data
        const visuals: VisualBlock[] = [];
        if (e.action) {
          if (e.action.status === 'applied' && e.action.result?.results) {
            visuals.push({
              type: 'action_card',
              data: {
                title: 'Changes applied ✓',
                changes: e.action.result.results.map((r) => ({ label: r.summary })),
                linkLabel: 'View changes',
              },
            });
          } else if (e.action.status === 'proposed') {
            visuals.push({
              type: 'confirmation_card',
              data: {
                title: e.action.strong ? 'Needs your confirmation 🔒' : 'Proposed changes 🧩',
                items: e.action.operations.map((op) => op.summary),
                strong: e.action.strong,
              },
            });
          }
          if (e.action.steps.length > 2) {
            visuals.push({
              type: 'work_timeline',
              data: {
                title: 'AURA worked on your plan 🛠️',
                steps: e.action.steps.map((s) => ({
                  label: s.label,
                  status: s.status === 'ok' ? 'done' : s.status === 'failed' ? 'active' : 'pending',
                })),
              },
            });
          }
        }
        const msg: ChatMsg = {
          id: `a${Date.now()}`,
          role: 'assistant',
          text: e.text,
          steps: curSteps,
          action: e.action,
          failed: e.failed,
          visuals,
        };
        setMsgs((m) => [...m, msg]);
        if (!e.failed) bump();
      }
      else if (e.type === 'error') {
        const msg: ChatMsg = {
          id: `a${Date.now()}`,
          role: 'assistant',
          text: e.error,
          steps: curSteps,
          action: null,
          failed: true,
          visuals: [],
        };
        setMsgs((m) => [...m, msg]);
      }
    }, ac.signal);

    await new Promise((r) => setTimeout(r, 100));
    setBusy(false);
    setStatusLabel('Thinking');
  };

  const applyAction = async (id: string) => {
    try {
      await api.post(`/agent/actions/${id}/apply`, { confirm: true });
      bump();
      setMsgs((m) => m.map((x) => x.action?.id === id ? { ...x, action: { ...x.action!, status: 'applied' } } : x));
    } catch {
      setMsgs((m) => m.map((x) => x.action?.id === id ? { ...x, action: { ...x.action!, status: 'failed' } } : x));
    }
  };
  const rejectAction = async (id: string) => {
    try {
      await api.post(`/agent/actions/${id}/reject`);
      setMsgs((m) => m.map((x) => x.action?.id === id ? { ...x, action: { ...x.action!, status: 'rejected' } } : x));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="agent"><LoadingState label="Checking AURA status" /></div>;
  if (error) return <div className="agent"><ErrorState text={error} onRetry={reload} /></div>;

  if (!status?.configured) return (
    <div className="agent">
      <div className="agent-intro page-enter">
        <BubbleIcon name="agent" size="xl" />
        <h1>AURA needs an AI key 🔑</h1>
        <Alert tone="accent" icon="info">
          AURA runs on your own Gemini API key (BYOK). Add it in <a href="/settings" className="link">Settings → AI / AURA</a> to get started.
          Everything else in LifeOS keeps working without it.
        </Alert>
      </div>
    </div>
  );
  if (!status?.enabled) return (
    <div className="agent">
      <div className="agent-intro page-enter">
        <BubbleIcon name="agent" size="xl" />
        <h1>AURA is turned off</h1>
        <Alert tone="accent" icon="info">Enable AURA in Settings → AI / AURA. 🧠</Alert>
      </div>
    </div>
  );

  return (
    <div className="agent">
      <div className="agent-scroll">
        {msgs.length === 0 ? (
          <div className="agent-intro page-enter">
            <BubbleIcon name="agent" size="xl" />
            <h1>How can I help? 🧠</h1>
            <p className="muted">Ask about your day, plans or priorities. I'll read your data, propose changes, and act with your confirmation. ✨</p>
            <div className="chips">{SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>)}</div>
            <p className="faint small">AURA · {status.model} · {status.quota.used}/{status.quota.limit} messages today</p>
          </div>
        ) : (
          <div className="thread" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>
                {m.role === 'user' && <div className="bubble-msg user">{m.text}</div>}
                {m.role === 'assistant' && (
                  <>
                    <div className="bubble-msg agent">{m.text}</div>
                    {m.visuals.map((v, i) => <VisualBlockRenderer key={i} block={v} />)}
                    {m.steps.length > 0 && (
                      <Surface className="tool-card" tone="raised">
                        {m.steps.map((s, i) => (
                          <div key={i} className="step-line" data-status={s.status}>
                            <Icon name={s.status === 'ok' ? 'check' : s.status === 'failed' ? 'alert' : 'sparkle'} />
                            <span>{s.label}</span>
                          </div>
                        ))}
                      </Surface>
                    )}
                    {m.action && m.action.status === 'proposed' && (
                      <Surface className="tool-card" tone="raised">
                        <div className="tool-head">
                          <span className="caption mono">{m.action.strong ? '🔒 Needs confirmation' : '🧩 Action'}</span>
                          <Badge tone="warn">
                            {m.action.status}
                          </Badge>
                        </div>
                        <p className="small">{m.action.request}</p>
                        {m.action.operations.map((op, i) => <p key={i} className="muted small">• {op.tool}: {op.summary}</p>)}
                        {m.action.status === 'proposed' && (
                          <div className="tool-actions">
                            <Button variant="primary" size="sm" icon="check" onClick={() => applyAction(m.action!.id)}>{m.action.strong ? 'Confirm' : 'Apply'}</Button>
                            <Button variant="ghost" size="sm" onClick={() => rejectAction(m.action!.id)}>Dismiss</Button>
                          </div>
                        )}
                      </Surface>
                    )}
                  </>
                )}
              </div>
            ))}
            {busy && (
              <div className="msg agent">
                <div className="agent-status-label">
                  <span className="thinking"><i /><i /><i /></span>
                  <span>{statusLabel}…</span>
                </div>
              </div>
            )}
            <div ref={end} />
          </div>
        )}
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <Icon name="agent" className="composer-icon" />
        <input className="composer-input" aria-label="Message AURA" placeholder="Ask AURA anything…" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
        <IconButton icon="send" label="Send" type="submit" disabled={!text.trim() || busy} />
      </form>
    </div>
  );
}
