import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, streamAgent } from '../../api/client';
import type { AgentAction, AgentEvent } from '../../api/client';
import { useApi, useCore } from '../../core/store';
import { Alert, Badge, BubbleIcon, Button, IconButton, Input, Surface } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';

type Step = { label: string; status: string; path?: string };
interface Msg { id: string; role: 'user' | 'assistant'; text: string; steps?: Step[]; action?: AgentAction | null; failed?: boolean }
interface Status { configured: boolean; model: string | null; enabled: boolean; quota: { used: number; limit: number } }

const SUGGESTIONS = ['What should I do right now?', 'Plan my week', 'Why am I behind?', 'Show me my weakest goals', 'Create a custom domain called Business', 'What keeps causing me to miss deadlines?'];

function ActionCard({ a, onChange }: { a: AgentAction; onChange: (a: AgentAction) => void }) {
  const { bump } = useCore(); const [busy, setBusy] = useState(false); const [typed, setTyped] = useState(''); const [err, setErr] = useState('');
  const call = async (path: string, body?: unknown) => {
    setBusy(true); setErr('');
    try { const r = await api.post<{ ok?: boolean; error?: string; action?: AgentAction }>(`/agent/actions/${a.id}/${path}`, body ?? {}); if (r.action) onChange(r.action); else onChange({ ...a, status: path === 'reject' ? 'rejected' : path === 'undo' ? 'undone' : a.status }); if (r.ok === false && r.error) setErr(r.error); bump(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Request failed'); } finally { setBusy(false); }
  };
  const done = a.result?.results ?? [];
  return (
    <Surface tone="raised" className="tool-card">
      <div className="tool-head"><span className="caption">{a.status === 'proposed' ? 'Proposed changes' : 'Changes'}</span><Badge tone={a.status === 'applied' ? 'ok' : a.status === 'failed' ? 'danger' : a.strong ? 'warn' : undefined}>{a.status}</Badge></div>
      <ul className="list">{a.operations.map((o, i) => <li key={i} className="row-sub" style={{ padding: '4px 0' }}>{o.strong && <Badge tone="danger">Permanent</Badge>} {o.summary}</li>)}</ul>
      {a.status === 'applied' && done.length > 0 && <p className="faint small">Verified in the database: {done.map((r) => r.after?.title ?? r.summary).join(', ')}.</p>}
      {a.status === 'proposed' && (
        <div className="stack">
          {a.strong && <Input aria-label="Type DELETE to confirm" placeholder="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} />}
          <div className="tool-actions"><Button variant="primary" size="sm" icon="check" disabled={busy || (a.strong && typed !== 'DELETE')} onClick={() => call('apply', a.strong ? { confirm: typed } : {})}>Apply</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => call('reject')}>Reject</Button></div>
        </div>)}
      {a.status === 'applied' && !a.operations.some((o) => o.strong) && <Button variant="ghost" size="sm" disabled={busy} onClick={() => call('undo')}>Undo</Button>}
      {err && <div className="form-error" role="alert">{err}</div>}
    </Surface>
  );
}

export default function AgentPage() {
  const nav = useNavigate(); const { bump } = useCore();
  const status = useApi<Status>('/agent/status');
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [live, setLive] = useState<Step[]>([]);
  const convo = useRef<string | undefined>(undefined); const end = useRef<HTMLDivElement>(null); const abort = useRef<AbortController | null>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy, live]);
  useEffect(() => { let on = true; api.get<{ id: string }[]>('/agent/conversations').then(async (l) => { if (!on || !l.length) return; convo.current = l[0].id; const h = await api.get<{ id: string; role: 'user' | 'assistant'; content: string; steps: Step[]; action: AgentAction | null; failed: boolean }[]>(`/agent/conversations/${l[0].id}`); if (on) setMsgs(h.map((m) => ({ id: m.id, role: m.role, text: m.content, steps: m.steps, action: m.action, failed: m.failed }))); }).catch(() => undefined); return () => { on = false; abort.current?.abort(); }; }, []);

  const send = useCallback(async (prompt: string) => {
    const p = prompt.trim(); if (!p || busy) return;
    setText(''); setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: p }]); setBusy(true); setLive([]);
    const steps: Step[] = []; abort.current = new AbortController();
    await streamAgent(p, convo.current, (e: AgentEvent) => {
      if (e.type === 'conversation') convo.current = e.id;
      else if (e.type === 'step') { steps.push({ label: e.label, status: e.status, path: e.path }); setLive([...steps]); }
      else if (e.type === 'done') { convo.current = e.conversationId; setMsgs((m) => [...m, { id: e.messageId, role: 'assistant', text: e.text, steps, action: e.action, failed: e.failed }]); bump(); }
      else if (e.type === 'error') setMsgs((m) => [...m, { id: `e${Date.now()}`, role: 'assistant', text: e.error, failed: true }]);
    }, abort.current.signal).catch(() => undefined);
    setBusy(false); setLive([]); status.reload();
  }, [busy, bump, status]);

  const s = status.data; const blocked = s && (!s.configured || !s.enabled);
  const StepList = ({ steps }: { steps: Step[] }) => <div className="agent-steps">{steps.map((st, i) => <div key={i} className="small faint"><Icon name={st.status === 'failed' ? 'alert' : st.status === 'proposed' ? 'clock' : 'check'} />{st.path ? <button type="button" className="link" onClick={() => nav(st.path!)}>{st.label}</button> : st.label}</div>)}</div>;
  return (
    <div className="agent">
      <div className="agent-scroll">
        {msgs.length === 0 ? (
          <div className="agent-intro page-enter">
            <BubbleIcon name="agent" size="xl" /><h1>How can I help?</h1>
            <p className="muted">I read your real LifeOS data, propose changes, and only say something was created after the database confirms it.</p>
            {s && !s.configured && <Alert tone="warn" icon="alert">The Agent’s model isn’t configured on this server. Add <b>AI_API_KEY</b> (and optionally AI_BASE_URL / AI_MODEL, e.g. a Groq OpenAI-compatible endpoint) in the app secrets. Everything else in LifeOS works without it.</Alert>}
            {s && s.configured && !s.enabled && <Alert tone="warn" icon="info">The Agent is turned off in Settings → Agent.</Alert>}
            <div className="chips">{SUGGESTIONS.map((x) => <button key={x} type="button" className="chip" disabled={!!blocked} onClick={() => send(x)}>{x}</button>)}</div>
          </div>
        ) : (
          <div className="thread" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`msg ${m.role === 'user' ? 'user' : 'agent'}`}>
                <div className={`bubble-msg ${m.role === 'user' ? 'user' : 'agent'}`}>{m.text}</div>
                {m.steps && m.steps.length > 0 && <StepList steps={m.steps} />}
                {m.action && <ActionCard a={m.action} onChange={(a) => setMsgs((all) => all.map((x) => (x.id === m.id ? { ...x, action: a } : x)))} />}
              </div>))}
            {busy && <div className="msg agent"><div className="bubble-msg agent thinking" role="status" aria-label="Agent is working"><i /><i /><i /></div>{live.length > 0 && <StepList steps={live} />}</div>}
            <div ref={end} />
          </div>)}
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <Icon name="agent" className="composer-icon" />
        <input className="composer-input" aria-label="Message the Agent" placeholder={blocked ? 'Agent unavailable' : 'Ask LifeOS anything…'} value={text} disabled={!!blocked} onChange={(e) => setText(e.target.value)} />
        <IconButton icon="send" label="Send" type="submit" disabled={!text.trim() || busy || !!blocked} />
      </form>
      {s && <p className="faint small" style={{ textAlign: 'center', margin: '4px 0' }}>{s.configured ? `${s.model} · ${s.quota.used}/${s.quota.limit} requests today` : 'No model configured'}</p>}
    </div>
  );
}
