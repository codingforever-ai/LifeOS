import type { AgentBackend, AgentMessage, ToolCall } from './contract';

/** DEMO ONLY. Scripted responses; it never reads or changes any LifeOS data. */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const id = () => `m${++n}-${Date.now()}`;

export const demoAgent: AgentBackend = {
  isDemo: true,
  async respond(prompt) {
    await wait(1200);
    const call: ToolCall = {
      id: id(), tool: 'calendar.move_event', title: 'Move “Deep work — motion guidelines” to 14:00', risk: 'write',
      args: [{ label: 'Event', value: 'Deep work — motion guidelines' }, { label: 'From', value: 'Today, 09:30' }, { label: 'To', value: 'Today, 14:00' }],
    };
    const out: AgentMessage[] = [
      { id: id(), role: 'agent', kind: 'text', text: `I looked at “${prompt.slice(0, 60)}” alongside today’s schedule and capacity. Your morning is the most contested part of the day.` },
      { id: id(), role: 'agent', kind: 'proposal', text: 'I’d suggest this change. Nothing happens until you confirm.', call, state: 'pending' },
    ];
    return out;
  },
  async execute(call) {
    await wait(900);
    return { callId: call.id, ok: true, summary: 'Demo run only — no data was changed.', details: ['In production, the tool call would run here and the result would be verified against your calendar.'] };
  },
};
