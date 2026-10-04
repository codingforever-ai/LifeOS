/**
 * Model provider abstraction. The Agent loop only knows `chat({messages, tools})`.
 * Default adapter speaks the OpenAI-compatible Chat Completions protocol (OpenAI, OpenRouter, Together, vLLM,
 * Anthropic's compat endpoint, …). Credentials come ONLY from server env: AI_API_KEY, AI_BASE_URL, AI_MODEL.
 * Add another adapter by implementing { configured(), describe(), chat() } and selecting it in `getProvider`.
 */
import { HttpError } from '../crud.mjs';

/** Token-lean tool schema: keep names, types, enums and required; drop per-property prose (tool description stays, first sentence). */
const lean = (n) => (Array.isArray(n) ? n.map(lean) : n && typeof n === 'object' ? Object.fromEntries(Object.entries(n).filter(([k, v]) => !(k === 'description' && typeof v === 'string')).map(([k, v]) => [k, lean(v)])) : n);
const firstSentence = (d = '') => (d.match(/^.*?[.!?](\s|$)/)?.[0] ?? d).trim().slice(0, 140);

const openaiCompatible = {
  name: 'openai-compatible',
  configured: () => !!process.env.AI_API_KEY,
  describe: () => ({ configured: !!process.env.AI_API_KEY, provider: 'openai-compatible', model: process.env.AI_MODEL || 'gpt-4o-mini', baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '') }),
  async chat({ messages, tools, signal }) {
    const { model, baseUrl } = this.describe();
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 90_000);
    signal?.addEventListener('abort', () => ctl.abort());
    let res;
    for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AI_API_KEY}` },
        body: JSON.stringify({ model, messages, temperature: 0.2, ...(tools?.length ? { tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: firstSentence(t.description), parameters: lean(t.parameters) } })), tool_choice: 'auto' } : {}) }),
      });
    } catch (e) {
      clearTimeout(timer);
      throw new HttpError(502, e.name === 'AbortError' ? 'The AI provider timed out.' : 'Could not reach the AI provider.');
    }
    if (res.status === 429 && attempt < 2) {
      // Honour the provider's rate-limit hint (e.g. "try again in 7.2s"), capped so the request stays responsive.
      let wait = Number(res.headers.get('retry-after')) || 0;
      if (!wait) { try { const m = /try again in ([\d.]+)s/i.exec((await res.clone().json())?.error?.message ?? ''); wait = m ? Number(m[1]) : 8; } catch { wait = 8; } }
      await new Promise((r) => setTimeout(r, Math.min(wait, 20) * 1000 + 300)); continue;
    }
    break; }
    clearTimeout(timer);
    if (!res.ok) {
      let detail = ''; try { detail = (await res.json())?.error?.message ?? ''; } catch { /* ignore */ }
      throw new HttpError(502, `The AI provider returned an error (${res.status})${detail ? `: ${String(detail).slice(0, 200)}` : ''}`);
    }
    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    if (!msg) throw new HttpError(502, 'The AI provider returned an empty response.');
    return { content: msg.content ?? '', toolCalls: (msg.tool_calls ?? []).map((c) => ({ id: c.id, name: c.function?.name, arguments: c.function?.arguments ?? '{}' })), usage: json.usage ?? null };
  },
};

export const getProvider = () => openaiCompatible;
