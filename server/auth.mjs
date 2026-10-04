import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { db } from './db.mjs';
import { HttpError, uid, DEFAULT_SETTINGS, getSettings } from './crud.mjs';
import { validTz } from './tz.mjs';

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
