export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) { super(message); }
}

async function request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-lifeos': '1', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Can’t reach LifeOS right now. Check your connection and try again.');
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const d = data as { error?: string; fields?: Record<string, string> } | null;
    if (res.status === 401) window.dispatchEvent(new Event('lifeos:unauthorized'));
    throw new ApiError(res.status, d?.error ?? `Request failed (${res.status})`, d?.fields);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b: unknown = {}) => request<T>('POST', p, b),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string, headers?: Record<string, string>) => request<T>('DELETE', p, undefined, headers),
};

export type AgentEvent =
  | { type: 'conversation'; id: string }
  | { type: 'thinking'; label?: string }
  | { type: 'step'; label: string; status: 'ok' | 'failed' | 'proposed'; entity?: string; id?: string }
  | { type: 'done'; conversationId: string; messageId: string; text: string; action: AgentAction | null; failed: boolean }
  | { type: 'error'; status: number; error: string; code?: string };

export interface AgentAction {
  id: string; request: string; status: 'proposed' | 'applied' | 'failed' | 'rejected' | 'undone'; strong: boolean;
  steps: { label: string; status: string }[]; operations: { tool: string; summary: string; strong: boolean }[];
  result?: { applied?: number; error?: string; results?: { entity: string; id: string; summary: string; after?: { title?: string } }[]; executed?: { entity: string; id: string; after?: { title?: string } }[] };
}

/** Streams Agent events (SSE over fetch so the session cookie is sent). */
export async function streamAgent(message: string, conversationId: string | undefined, onEvent: (e: AgentEvent) => void, signal?: AbortSignal) {
  const res = await fetch('/api/agent/chat', { method: 'POST', credentials: 'same-origin', signal, headers: { 'content-type': 'application/json', 'x-lifeos': '1' }, body: JSON.stringify({ message, conversationId }) });
  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status})`; try { msg = (await res.json()).error ?? msg; } catch { /* ignore */ }
    onEvent({ type: 'error', status: res.status, error: msg }); return;
  }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) { const chunk = buf.slice(0, i); buf = buf.slice(i + 2); if (chunk.startsWith('data: ')) { try { onEvent(JSON.parse(chunk.slice(6))); } catch { /* skip */ } } }
  }
}
