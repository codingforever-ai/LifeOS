import { useEffect, useRef, useState } from 'react';
import { useApi, useCore } from '../../core/store';
import { api, streamAgent, type AgentEvent, type AgentAction } from '../../api/client';
import { Alert, Badge, BubbleIcon, Button, IconButton, Surface, LoadingState, ErrorState } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';

interface ChatMsg { id: string; role: 'user' | 'assistant'; text: string; steps: { label: string; status: string }[]; action: AgentAction | null; failed: boolean }
interface Status { configured: boolean; provider: string; model: string | null; enabled: boolean; quota: { used: number; limit: number } }

const SUGGESTIONS = ['Plan my afternoon', 'What should I move off today?', 'What am I behind on?', 'Create a task to review the design tomorrow at 10 AM'];

export default function AgentPage() {
  const { bump } = useCore();
  const { data: status, loading, error, reload } = useApi<Status>('/agent/status');
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  const send = async (prompt: string) => {
    const p = prompt.trim();
    if (!p || busy) return;
    setText(''); setBusy(true);
    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', text: p, steps: [], action: null, failed: false };
    setMsgs((m) => [...m, userMsg]);

    const ac = new AbortController(); abortRef.current = ac;
    let curSteps: { label: string; status: string }[] = [];
    let curAction: AgentAction | null = null;
    let convId: string | undefined;

    streamAgent(p, undefined, (e: AgentEvent) => {
      if (e.type === 'conversation') convId = e.id;
      else if (e.type === 'step') { curSteps = [...curSteps, { label: e.label, status: e.status }]; setMsgs((m) => m.map((x) => x.id === userMsg.id ? { ...x, steps: curSteps } : x)); }
      else if (e.type === 'done') {
        const msg: ChatMsg = { id: `a${Date.now()}`, role: 'assistant', text: e.text, steps: curSteps, action: e.action, failed: e.failed };
        setMsgs((m) => [...m, msg]);
        if (!e.failed) bump();
      }
      else if (e.type === 'error') {
        const msg: ChatMsg = { id: `a${Date.now()}`, role: 'assistant', text: e.error, steps: curSteps, action: null, failed: true };
        setMsgs((m) => [...m, msg]);
      }
    }, ac.signal);

    // Wait for stream to finish (streamAgent resolves when done)
    await new Promise((r) => setTimeout(r, 100));
    setBusy(false);
  };

  const applyAction = async (id: string) => {
    try { await api.post(`/agent/actions/${id}/apply`, { confirm: true }); bump(); setMsgs((m) => m.map((x) => x.action?.id === id ? { ...x, action: { ...x.action!, status: 'applied' } } : x)); }
    catch (e) { setMsgs((m) => m.map((x) => x.action?.id === id ? { ...x, action: { ...x.action!, status: 'failed' } } : x)); }
  };
  const rejectAction = async (id: string) => {
    try { await api.post(`/agent/actions/${id}/reject`); setMsgs((m) => m.map((x) => x.action?.id === id ? { ...x, action: { ...x.action!, status: 'rejected' } } : x)); }
    catch { /* ignore */ }
  };

  if (loading) return <div className="agent"><LoadingState label="Checking Agent status" /></div>;
  if (error) return <div className="agent"><ErrorState text={error} onRetry={reload} /></div>;

  if (!status?.configured) return (
    <div className="agent">
      <div className="agent-intro page-enter">
        <BubbleIcon name="agent" size="xl" />
        <h1>Agent not configured</h1>
        <Alert tone="accent" icon="info">The server needs AI_API_KEY (and optionally AI_BASE_URL / AI_MODEL) to run the Agent. Everything else in LifeOS keeps working.</Alert>
      </div>
    </div>
  );
  if (!status?.enabled) return (
    <div className="agent">
      <div className="agent-intro page-enter">
        <BubbleIcon name="agent" size="xl" />
        <h1>Agent is turned off</h1>
        <Alert tone="accent" icon="info">Enable the Agent in Settings → AI / Agent.</Alert>
      </div>
    </div>
  );

  return (
    <div className="agent">
      <div className="agent-scroll">
        {msgs.length === 0 ? (
          <div className="agent-intro page-enter">
            <BubbleIcon name="agent" size="xl" />
            <h1>How can I help?</h1>
            <p className="muted">Ask about your day, plans or priorities. I'll read your data, propose changes, and act with your confirmation.</p>
            <div className="chips">{SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>)}</div>
            <p className="faint small">Model: {status.model} · {status.quota.used}/{status.quota.limit} messages today</p>
          </div>
        ) : (
          <div className="thread" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>
                {m.role === 'user' && <div className="bubble-msg user">{m.text}</div>}
                {m.role === 'assistant' && (
                  <>
                    <div className="bubble-msg agent">{m.text}</div>
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
                    {m.action && (
                      <Surface className="tool-card" tone={m.action.status === 'applied' ? 'accent' : 'raised'}>
                        <div className="tool-head">
                          <span className="caption mono">{m.action.strong ? 'Needs confirmation' : 'Action'}</span>
                          <Badge tone={m.action.status === 'applied' ? 'ok' : m.action.status === 'failed' ? 'danger' : m.action.status === 'rejected' ? undefined : 'warn'}>
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
            {busy && <div className="msg agent"><div className="bubble-msg agent thinking"><i /><i /><i /></div></div>}
            <div ref={end} />
          </div>
        )}
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <Icon name="agent" className="composer-icon" />
        <input className="composer-input" aria-label="Message the Agent" placeholder="Ask LifeOS anything…" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
        <IconButton icon="send" label="Send" type="submit" disabled={!text.trim() || busy} />
      </form>
    </div>
  );
}
