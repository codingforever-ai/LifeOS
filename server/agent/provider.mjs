/**
 * Model provider abstraction. The Agent loop only knows `chat({messages, tools})`.
 * Default adapter speaks the OpenAI-compatible Chat Completions protocol (OpenAI, OpenRouter, Together, vLLM,
 * Anthropic's compat endpoint, …). Credentials come ONLY from server env: AI_API_KEY, AI_BASE_URL, AI_MODEL.
 * Add another adapter by implementing { configured(), describe(), chat() } and selecting it in `getProvider`.
 */
import { HttpError } from '../crud.mjs';

const openaiCompatible = {
  name: 'openai-compatible',
  configured: () => !!process.env.AI_API_KEY,
  describe: () => ({ configured: !!process.env.AI_API_KEY, provider: 'openai-compatible', model: process.env.AI_MODEL || 'gpt-4o-mini', baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '') }),
  async chat({ messages, tools, signal }) {
    const { model, baseUrl } = this.describe();
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 90_000);
    signal?.addEventListener('abort', () => ctl.abort());
    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AI_API_KEY}` },
        body: JSON.stringify({ model, messages, temperature: 0.2, ...(tools?.length ? { tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })), tool_choice: 'auto' } : {}) }),
      });
    } catch (e) {
      throw new HttpError(502, e.name === 'AbortError' ? 'The AI provider timed out.' : 'Could not reach the AI provider.');
    } finally { clearTimeout(timer); }
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
