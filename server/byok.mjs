/**
 * BYOK (Bring Your Own Key) — secure per-user AI key storage.
 * Keys are encrypted at rest with a server-side key derived from BYOK_SECRET (or a fallback).
 * The key is NEVER returned to the client after storage — only a hint (last 4 chars) is exposed.
 */
import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'node:crypto';
import { db } from './db.mjs';
import { HttpError, uid } from './crud.mjs';

const SECRET = process.env.BYOK_SECRET || 'lifeos-byok-default-secret-key-v1';
const KEY = scryptSync(SECRET, 'lifeos-salt', 32);
const ALGO = 'aes-256-gcm';

function encrypt(plain) {
  const iv = randomBytes(12);
  const c = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}
function decrypt(blob) {
  const [ivHex, tagHex, encHex] = blob.split(':');
  if (!ivHex || !tagHex || !encHex) return null;
  const d = createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([d.update(Buffer.from(encHex, 'hex')), d.final()]).toString('utf8');
}

const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

export function saveKey(userId, { apiKey, model, baseUrl }) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) throw new HttpError(400, 'API key looks too short', { apiKey: 'Invalid key' });
  const modelVal = model || DEFAULT_MODEL;
  const baseVal = baseUrl || DEFAULT_BASE;
  const hint = apiKey.slice(-4);
  const enc = encrypt(apiKey.trim());
  const t = new Date().toISOString();
  const ex = db.prepare('SELECT id FROM ai_keys WHERE user_id = ? AND provider = ?').get(userId, 'gemini');
  if (ex) {
    db.prepare('UPDATE ai_keys SET key_enc = ?, key_hint = ?, model = ?, base_url = ?, status = ?, updated_at = ? WHERE id = ?').run(enc, hint, modelVal, baseVal, 'active', t, ex.id);
    return { id: ex.id, provider: 'gemini', model: modelVal, baseUrl: baseVal, keyHint: hint, status: 'active' };
  }
  const id = uid();
  db.prepare('INSERT INTO ai_keys (id, user_id, provider, key_enc, key_hint, model, base_url, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, userId, 'gemini', enc, hint, modelVal, baseVal, 'active', t, t);
  return { id, provider: 'gemini', model: modelVal, baseUrl: baseVal, keyHint: hint, status: 'active' };
}

export function deleteKey(userId) {
  db.prepare('UPDATE ai_keys SET status = ? WHERE user_id = ? AND provider = ?').run('revoked', userId, 'gemini');
  return { ok: true };
}

export function getKeyInfo(userId) {
  const row = db.prepare("SELECT id, model, base_url, key_hint, status, tested_at FROM ai_keys WHERE user_id = ? AND provider = 'gemini' AND status = 'active'").get(userId);
  if (!row) return { configured: false, provider: 'gemini', model: DEFAULT_MODEL, baseUrl: DEFAULT_BASE, keyHint: null, status: null };
  return { configured: true, provider: 'gemini', model: row.model, baseUrl: row.base_url, keyHint: row.key_hint, status: row.status, testedAt: row.tested_at };
}

/** Retrieve the decrypted key for server-side AI calls. Never expose to client. */
export function getDecryptedKey(userId) {
  const row = db.prepare("SELECT key_enc FROM ai_keys WHERE user_id = ? AND provider = 'gemini' AND status = 'active'").get(userId);
  if (!row) return null;
  return decrypt(row.key_enc);
}

/** Test the key by making a minimal request to the provider. Returns success or a specific error. */
export async function testKey(userId) {
  const key = getDecryptedKey(userId);
  if (!key) throw new HttpError(400, 'No API key configured');
  const row = db.prepare("SELECT model, base_url FROM ai_keys WHERE user_id = ? AND provider = 'gemini' AND status = 'active'").get(userId);
  const model = row?.model || DEFAULT_MODEL;
  const baseUrl = (row?.base_url || DEFAULT_BASE).replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      db.prepare('UPDATE ai_keys SET tested_at = ? WHERE user_id = ? AND provider = ?').run(new Date().toISOString(), userId, 'gemini');
      return { ok: true, model };
    }
    let detail = '';
    try { detail = (await res.json())?.error?.message ?? ''; } catch { /* ignore */ }
    if (res.status === 401 || res.status === 403) throw new HttpError(401, `Authentication failed (${res.status}). The key may be invalid or expired.`);
    if (res.status === 404) throw new HttpError(404, `Model "${model}" was not found. Check the model name.`);
    if (res.status === 429) throw new HttpError(429, 'Rate limited. Your Google project quota may be exhausted.');
    throw new HttpError(res.status, `Provider error (${res.status})${detail ? `: ${String(detail).slice(0, 200)}` : ''}`);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e.name === 'TimeoutError' || e.name === 'AbortError') throw new HttpError(504, 'Connection timed out. Check your network and try again.');
    throw new HttpError(502, `Could not reach the AI provider: ${e.message}`);
  }
}
