import { useEffect, useRef, useState } from 'react';
import { Alert, BubbleIcon, Button, Badge, IconButton, Surface } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import type { AgentMessage, ToolCall } from './contract';
import { demoAgent as agent } from './demoAgent';

const SUGGESTIONS = ['Plan my afternoon', 'What should I move off today?', 'Summarise my week'];

function Thinking() {
  return <div className="bubble-msg agent thinking" role="status" aria-label="Agent is thinking"><i /><i /><i /></div>;
}

function ProposalCard({ m, onDecide }: { m: Extract<AgentMessage, { kind: 'proposal' }>; onDecide: (id: string, ok: boolean) => void }) {
  const { call } = m;
  return (
    <Surface tone="raised" className="tool-card">
      <div className="tool-head">
        <span className="caption mono">{call.tool}</span>
        <Badge tone={call.risk === 'write' ? 'warn' : undefined}>{call.risk === 'write' ? 'Changes data' : 'Read only'}</Badge>
      </div>
      <h3>{call.title}</h3>
      <dl className="facts">{call.args.map((a) => <><dt key={a.label}>{a.label}</dt><dd>{a.value}</dd></>)}</dl>
      {m.state === 'pending' ? (
        <div className="tool-actions">
          <Button variant="primary" size="sm" icon="check" onClick={() => onDecide(m.id, true)}>Confirm</Button>
          <Button variant="ghost" size="sm" onClick={() => onDecide(m.id, false)}>Dismiss</Button>
        </div>
      ) : <Badge tone={m.state === 'confirmed' ? 'ok' : undefined}>{m.state === 'confirmed' ? 'Confirmed' : 'Dismissed'}</Badge>}
    </Surface>
  );
}

export default function AgentPage() {
  const [msgs, setMsgs] = useState<AgentMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  const send = async (prompt: string) => {
    const p = prompt.trim();
    if (!p || busy) return;
    setText('');
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: p }]);
    setBusy(true);
    const out = await agent.respond(p);
    setMsgs((m) => [...m, ...out]);
    setBusy(false);
  };

  const decide = async (mid: string, ok: boolean) => {
    let call: ToolCall | undefined;
    setMsgs((ms) => ms.map((m) => { if (m.id === mid && m.role === 'agent' && m.kind === 'proposal') { call = m.call; return { ...m, state: ok ? 'confirmed' : 'dismissed' }; } return m; }));
    if (!ok || !call) return;
    setBusy(true);
    const result = await agent.execute(call);
    setMsgs((m) => [...m, { id: `r${Date.now()}`, role: 'agent', kind: 'result', result }]);
    setBusy(false);
  };

  return (
    <div className="agent">
      <div className="agent-scroll">
        {msgs.length === 0 ? (
          <div className="agent-intro page-enter">
            <BubbleIcon name="agent" size="xl" />
            <h1>How can I help?</h1>
            <p className="muted">Ask about your day, plans or priorities. In the future, I’ll act across your whole life through structured tools.</p>
            <div className="chips">{SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>)}</div>
            <Alert tone="accent" icon="info">Demo mode: responses are scripted and the Agent can’t change anything yet.</Alert>
          </div>
        ) : (
          <div className="thread" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>
                {m.role === 'user' && <div className="bubble-msg user">{m.text}</div>}
                {m.role === 'agent' && m.kind === 'text' && <div className="bubble-msg agent">{m.text}</div>}
                {m.role === 'agent' && m.kind === 'proposal' && <><div className="bubble-msg agent">{m.text}</div><ProposalCard m={m} onDecide={decide} /></>}
                {m.role === 'agent' && m.kind === 'result' && (
                  <Surface className="tool-card" tone="accent">
                    <div className="tool-head"><span className="caption">Result</span><Badge tone={m.result.ok ? 'ok' : 'danger'}>{m.result.ok ? 'Done' : 'Failed'}</Badge></div>
                    <p>{m.result.summary}</p>
                    {m.result.details?.map((d) => <p key={d} className="muted small">{d}</p>)}
                  </Surface>
                )}
              </div>
            ))}
            {busy && <div className="msg agent"><Thinking /></div>}
            <div ref={end} />
          </div>
        )}
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <Icon name="agent" className="composer-icon" />
        <input className="composer-input" aria-label="Message the Agent" placeholder="Ask LifeOS anything…" value={text} onChange={(e) => setText(e.target.value)} />
        <IconButton icon="send" label="Send" type="submit" disabled={!text.trim() || busy} />
      </form>
    </div>
  );
}
