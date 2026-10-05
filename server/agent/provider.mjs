/**
 * Model provider abstraction. The Agent loop only knows `chat({messages, tools})`.
 * Supports BYOK (Bring Your Own Key): each user's Gemini key is stored encrypted server-side
 * and retrieved per-request. Falls back to server env AI_API_KEY for legacy/server-level config.
 *
 * Speaks the OpenAI-compatible Chat Completions protocol (Gemini's OpenAI-compatible endpoint,
 * OpenAI, OpenRouter, Together, vLLM, Anthropic's compat endpoint, …).
 * Add another adapter by implementing { configured(), describe(), chat() } and selecting it in `getProvider`.
 */
import { HttpError } from '../crud.mjs';
import { getDecryptedKey, getKeyInfo } from '../byok.mjs';

/** Token-lean tool schema: keep names, types, enums and required; drop per-property prose (tool description stays, first sentence). */
const lean = (n) => (Array.isArray(n) ? n.map(lean) : n && typeof n === 'object' ? Object.fromEntries(Object.entries(n).filter(([k, v]) => !(k === 'description' && typeof v === 'string')).map(([k, v]) => [k, lean(v)])) : n);
const firstSentence = (d = '') => (d.match(/^.*?[.!?](\s|$)/)?.[0] ?? d).trim().slice(0, 140);

const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

/**
 * Create a provider instance for a specific user (BYOK).
 * Resolves the key from the user's stored BYOK config, falling back to server env.
 */
export function getProvider(userId) {
  return {
    name: 'gemini-byok',
    configured() {
      if (userId) {
        const info = getKeyInfo(userId);
        if (info.configured) return true;
      }
      return !!process.env.AI_API_KEY;
    },
    describe() {
      if (userId) {
        const info = getKeyInfo(userId);
        if (info.configured) return { configured: true, provider: 'gemini', model: info.model, baseUrl: info.baseUrl, byok: true };
      }
      return { configured: !!process.env.AI_API_KEY, provider: 'openai-compatible', model: process.env.AI_MODEL || DEFAULT_MODEL, baseUrl: (process.env.AI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, ''), byok: false };
    },
    async chat({ messages, tools, signal }) {
      const desc = this.describe();
      const { model, baseUrl } = desc;

      // Resolve the API key: BYOK first, then server env fallback
      let apiKey = null;
      if (userId) apiKey = getDecryptedKey(userId);
      if (!apiKey) apiKey = process.env.AI_API_KEY;
      if (!apiKey) throw new HttpError(503, 'No AI key configured. Add your Gemini API key in Settings → AI / AURA.');

      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 90_000);
      signal?.addEventListener('abort', () => ctl.abort());
      let res;
      for (let attempt = 0; ; attempt++) {
        try {
          res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST', signal: ctl.signal,
            headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages, temperature: 0.2, ...(tools?.length ? { tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: firstSentence(t.description), parameters: lean(t.parameters) } })), tool_choice: 'auto' } : {}) }),
          });
        } catch (e) {
          clearTimeout(timer);
          throw new HttpError(502, e.name === 'AbortError' ? 'The AI provider timed out.' : 'Could not reach the AI provider.');
        }
        if (res.status === 429 && attempt < 2) {
          let wait = Number(res.headers.get('retry-after')) || 0;
          if (!wait) { try { const m = /try again in ([\d.]+)s/i.exec((await res.clone().json())?.error?.message ?? ''); wait = m ? Number(m[1]) : 8; } catch { wait = 8; } }
          await new Promise((r) => setTimeout(r, Math.min(wait, 20) * 1000 + 300));
          continue;
        }
        break;
      }
      clearTimeout(timer);
      if (!res.ok) {
        let detail = '';
        try { detail = (await res.json())?.error?.message ?? ''; } catch { /* ignore */ }
        if (res.status === 401 || res.status === 403) throw new HttpError(401, `Authentication failed. Your Gemini API key may be invalid or expired.${detail ? ` (${String(detail).slice(0, 150)})` : ''}`);
        if (res.status === 404) throw new HttpError(404, `Model "${model}" was not found. Check Settings → AI / AURA.`);
        if (res.status === 429) throw new HttpError(429, 'Rate limited. Your Google project quota may be exhausted.');
        throw new HttpError(502, `The AI provider returned an error (${res.status})${detail ? `: ${String(detail).slice(0, 200)}` : ''}`);
      }
      const json = await res.json();
      const msg = json?.choices?.[0]?.message;
      if (!msg) throw new HttpError(502, 'The AI provider returned an empty response.');
      return { content: msg.content ?? '', toolCalls: (msg.tool_calls ?? []).map((c) => ({ id: c.id, name: c.function?.name, arguments: c.function?.arguments ?? '{}' })), usage: json.usage ?? null };
    },
  };
}

// Legacy: allow `getProvider()` without userId for status checks
export function getProviderLegacy() {
  return getProvider(null);
}
