import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { db } from './db.mjs';
import { HttpError, uid, DEFAULT_SETTINGS, getSettings } from './crud.mjs';
import { validTz } from './tz.mjs';
import { googleConfigured, googleAuthUrl, exchangeCode, getGoogleUserInfo } from './google.mjs';

const COOKIE = 'lifeos_session';
const SESSION_DAYS = 30;
const sha = (s) => createHash('sha256').update(s).digest('hex');

export function hashPassword(pw) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(pw, salt, 64).toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const a = scryptSync(pw, Buffer.from(salt, 'hex'), 64); const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/* naive in-memory rate limiter (per key, sliding window) */
const hits = new Map();
export function rateLimit(key, max, windowMs) {
  const t = Date.now(); const arr = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
  if (arr.length >= max) { hits.set(key, arr); throw new HttpError(429, 'Too many attempts. Please wait a moment and try again.'); }
  arr.push(t); hits.set(key, arr);
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, created_at: u.created_at, settings: getSettings(u.id) });

function issueSession(userId, req) {
  const token = randomBytes(32).toString('base64url');
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  db.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at,user_agent) VALUES (?,?,?,?,?)').run(sha(token), userId, new Date().toISOString(), exp, String(req.headers['user-agent'] ?? '').slice(0, 200));
  return token;
}
export const setCookie = (res, token, maxAge = SESSION_DAYS * 86400) =>
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`);

export function sessionToken(req) {
  const c = req.headers.cookie ?? '';
  const m = c.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  return m ? m.slice(COOKIE.length + 1) : null;
}

/** Resolve the authenticated user from the session cookie ONLY. Client-provided user ids are never read. */
export function authenticate(req) {
  const token = sessionToken(req);
  if (!token) return null;
  const s = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(sha(token));
  if (!s || s.expires_at < new Date().toISOString()) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(s.user_id) ?? null;
}

const emailOk = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function register(body, req, res) {
  const { email, password, name, timezone } = body ?? {};
  rateLimit(`reg:${req.socket.remoteAddress}`, 10, 3600_000);
  if (!emailOk(email)) throw new HttpError(400, 'Enter a valid email address', { email: 'Invalid email' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) throw new HttpError(400, 'Password must be at least 8 characters', { password: 'At least 8 characters' });
  if (typeof name !== 'string' || !name.trim() || name.length > 80) throw new HttpError(400, 'Enter your name', { name: 'Required' });
  const mail = email.toLowerCase().trim();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(mail)) throw new HttpError(409, 'An account with that email already exists', { email: 'Already registered' });
  const id = uid();
  const settings = { ...DEFAULT_SETTINGS, timezone: validTz(timezone) ? timezone : 'UTC' };
  db.prepare('INSERT INTO users (id,email,name,password_hash,settings,created_at) VALUES (?,?,?,?,?,?)').run(id, mail, name.trim(), hashPassword(password), JSON.stringify(settings), new Date().toISOString());
  setCookie(res, issueSession(id, req));
  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
}

export function login(body, req, res) {
  const { email, password } = body ?? {};
  rateLimit(`login:${req.socket.remoteAddress}`, 20, 600_000);
  if (typeof email === 'string') rateLimit(`login:${email.toLowerCase()}`, 8, 600_000);
  const u = typeof email === 'string' ? db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) : null;
  const ok = u && typeof password === 'string' && verifyPassword(password, u.password_hash);
  if (!ok) throw new HttpError(401, 'Incorrect email or password');
  setCookie(res, issueSession(u.id, req));
  return publicUser(u);
}

export function logout(req, res) {
  const t = sessionToken(req);
  if (t) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(t));
  setCookie(res, '', 0);
}
export const sessionUser = publicUser;

export function changePassword(user, body, req, res) {
  const { current, next } = body ?? {};
  if (!verifyPassword(String(current ?? ''), user.password_hash)) throw new HttpError(403, 'Current password is incorrect', { current: 'Incorrect' });
  if (typeof next !== 'string' || next.length < 8 || next.length > 200) throw new HttpError(400, 'New password must be at least 8 characters', { next: 'At least 8 characters' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id); // revoke all sessions
  setCookie(res, issueSession(user.id, req));
}
export function revokeOtherSessions(user, req) {
  const t = sessionToken(req);
  return db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(user.id, sha(t ?? '')).changes;
}
export function deleteAccount(user, body, res) {
  if (!verifyPassword(String(body?.password ?? ''), user.password_hash)) throw new HttpError(403, 'Password is incorrect', { password: 'Incorrect' });
  if (body?.confirm !== 'DELETE') throw new HttpError(400, 'Type DELETE to confirm', { confirm: 'Type DELETE' });
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id); // cascades to every user-owned table
  setCookie(res, '', 0);
}

/* ---------- Google OAuth ---------- */

const OAUTH_STATE_COOKIE = 'lifeos_oauth_state';
const OAUTH_SENTINEL = '!oauth'; // stored in password_hash for OAuth-only users

/** A short-lived cookie carries the OAuth state + redirect_uri through the Google round-trip
 *  (Google echoes back only code+state, so we must remember the redirect_uri ourselves). */
function setStateCookie(res, state, redirectUri) {
  const val = `${state}|${redirectUri}`;
  res.setHeader('Set-Cookie', `${OAUTH_STATE_COOKIE}=${encodeURIComponent(val)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`);
}
function readStateCookie(req) {
  const c = req.headers.cookie ?? '';
  const raw = (c.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${OAUTH_STATE_COOKIE}=`)) ?? '').slice(OAUTH_STATE_COOKIE.length + 1);
  if (!raw) return null;
  try { const [state, redirectUri] = decodeURIComponent(raw).split('|'); return { state, redirectUri }; } catch { return null; }
}
function clearStateCookie(res) {
  res.setHeader('Set-Cookie', `${OAUTH_STATE_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`);
}

/** Validate that a redirect_uri points back to our own callback path (open-redirect defence). */
function validRedirectUri(uri) {
  if (typeof uri !== 'string' || !uri) return false;
  try {
    const u = new URL(uri);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.pathname === '/api/auth/google/callback';
  } catch { return false; }
}

/** Begin Google OAuth: redirect the browser to Google's consent screen. */
export function googleStart(query, req, res) {
  if (!googleConfigured()) throw new HttpError(503, 'Google sign-in is not configured yet. Add your Google credentials to enable it.', { code: 'not_configured' });
  const redirectUri = query.redirect_uri;
  if (!validRedirectUri(redirectUri)) throw new HttpError(400, 'Invalid redirect URI');
  const state = randomBytes(16).toString('hex');
  setStateCookie(res, state, redirectUri);
  return googleAuthUrl(redirectUri, state);
}

/**
 * Complete Google OAuth: exchange the code, verify the profile, then find-or-link-or-create
 * the LifeOS user and issue a session. Never duplicates accounts; never overwrites existing data.
 */
export async function googleFinish(query, req, res) {
  const { code, state, error } = query ?? {};
  if (error) throw new Error(`Google returned an error: ${error}`);
  if (!code) throw new Error('Missing authorization code');
  const saved = readStateCookie(req);
  clearStateCookie(res);
  if (!saved || !state || state !== saved.state) throw new Error('Security check failed (invalid state). Please try again.');

  const redirectUri = saved.redirectUri;
  if (!validRedirectUri(redirectUri)) throw new Error('Invalid redirect URI');

  const tokens = await exchangeCode(code, redirectUri);
  const info = await getGoogleUserInfo(tokens.access_token);
  if (!info?.email || info.email_verified !== true && info.email_verified !== 'true') throw new Error('Google did not return a verified email');

  const email = String(info.email).toLowerCase().trim();
  const sub = String(info.sub);
  const name = (info.name || email.split('@')[0] || 'LifeOS user').slice(0, 80);
  const picture = info.picture ? String(info.picture).slice(0, 500) : null;

  // 1. Returning Google user?
  let u = db.prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?').get('google', sub);
  if (!u) {
    // 2. Existing LifeOS account with the same email — link Google to it (preserve all data).
    u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (u) {
      db.prepare('UPDATE users SET provider = ?, provider_id = ?, picture = COALESCE(?, picture) WHERE id = ?').run('google', sub, picture, u.id);
      u = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    } else {
      // 3. Brand-new Google user.
      const id = uid();
      const settings = { ...DEFAULT_SETTINGS, timezone: 'UTC' };
      db.prepare('INSERT INTO users (id,email,name,password_hash,settings,created_at,provider,provider_id,picture) VALUES (?,?,?,?,?,?,?,?,?)').run(id, email, name, OAUTH_SENTINEL, JSON.stringify(settings), new Date().toISOString(), 'google', sub, picture);
      u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
  }
  setCookie(res, issueSession(u.id, req));
  return publicUser(u);
}

/** Map a raw OAuth error to a polished, user-facing message. */
export function friendlyGoogleError(e) {
  const m = String(e?.message || e || '');
  if (/invalid_state|state/i.test(m)) return 'Security check failed. Please try Google sign-in again.';
  if (/invalid_grant|expired/i.test(m)) return 'The Google session expired. Please try again.';
  if (/redirect_uri_mismatch/i.test(m)) return 'Google sign-in is misconfigured (redirect URI). Please contact support.';
  if (/access_denied|cancelled/i.test(m)) return 'Google sign-in was cancelled.';
  if (/not_configured/i.test(m)) return 'Google sign-in is not configured yet. Add your Google credentials to enable it.';
  if (/Failed to fetch|fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(m)) return 'Could not reach Google. Check your connection and try again.';
  return 'Google sign-in couldn’t be completed. Please try again.';
}
