import { randomUUID } from 'node:crypto';
import { db, tx } from './db.mjs';
import { ENTITIES, TIMELINE_ENTITIES, titleOf } from './schema.mjs';
import { nextOccurrence, parts, validTz } from './tz.mjs';

export class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
const bad = (msg, fields) => new HttpError(400, msg, fields);
const now = () => new Date().toISOString();
export const uid = () => randomUUID();

export const DEFAULT_SETTINGS = {
  timezone: 'UTC', language: 'en', weekStart: 1, workStart: '09:00', workEnd: '17:30', workDays: [1, 2, 3, 4, 5], bufferMin: 30,
  theme: 'dark', density: 'comfortable', motion: 'system',
  notifications: { deadlines: true, overdue: true, capacity: true, stalled: true, habits: true, agent: true, maxPerDay: 6 },
  privacy: { agentUsesMemory: true, agentMayReadNotes: true },
  agent: { enabled: true, confirmCreates: false },
  domains: ['study', 'academic', 'work', 'fitness', 'finance', 'personal'],
  onboarding: { done: false, step: 0 },
  recentSearches: [],
};
export function getSettings(userId) {
  const row = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId);
  const s = row ? JSON.parse(row.settings || '{}') : {};
  const merge = (d, v) => Object.fromEntries(Object.entries(d).map(([k, dv]) => [k, dv && typeof dv === 'object' && !Array.isArray(dv) ? merge(dv, v?.[k] ?? {}) : (v?.[k] ?? dv)]));
  return merge(DEFAULT_SETTINGS, s);
}
export function userTz(userId) { const t = getSettings(userId).timezone; return validTz(t) ? t : 'UTC'; }

/* ---------------- validation ---------------- */
function coerceField(userId, name, key, f, v) {
  if (v === null || v === undefined || v === '') {
    if (f.req) throw bad(`${key} is required`, { [key]: 'Required' });
    return null;
  }
  switch (f.t) {
    case 'str': case 'text': {
      if (typeof v !== 'string') throw bad(`${key} must be text`, { [key]: 'Must be text' });
      if (v.length > f.max) throw bad(`${key} is too long`, { [key]: `Max ${f.max} characters` });
      if (f.req && !v.trim()) throw bad(`${key} is required`, { [key]: 'Required' });
      return v.trim();
    }
    case 'enum': if (!f.values.includes(v)) throw bad(`${key} must be one of ${f.values.join(', ')}`, { [key]: 'Invalid option' }); return v;
    case 'int': {
      const n = Number(v);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < f.min || n > f.max) throw bad(`${key} must be a whole number between ${f.min} and ${f.max}`, { [key]: `${f.min}–${f.max}` });
      return n;
    }
    case 'real': { const n = Number(v); if (!Number.isFinite(n)) throw bad(`${key} must be a number`, { [key]: 'Must be a number' }); return n; }
    case 'bool': return v === true || v === 1 || v === 'true' ? 1 : 0;
    case 'ts': { const t = new Date(v); if (typeof v !== 'string' && typeof v !== 'number' || Number.isNaN(t.getTime())) throw bad(`${key} must be a valid date-time`, { [key]: 'Invalid date' }); return t.toISOString(); }
    case 'day': {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw bad(`${key} must be YYYY-MM-DD`, { [key]: 'Use YYYY-MM-DD' });
      const [y, m, d] = v.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d));
      if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) throw bad(`${key} is not a real date`, { [key]: 'Not a real date' });
      return v;
    }
    case 'json': {
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      if (s.length > f.max) throw bad(`${key} is too large`, { [key]: 'Too large' });
      if (typeof v === 'string') { try { JSON.parse(v); } catch { throw bad(`${key} must be valid JSON`, { [key]: 'Invalid' }); } }
      if (key === 'recurrence') {
        const r = typeof v === 'string' ? JSON.parse(v) : v;
        if (!r || !['daily', 'weekly', 'monthly', 'yearly'].includes(r.freq)) return null; // "none"
        if (r.interval !== undefined && !(Number.isInteger(r.interval) && r.interval >= 1 && r.interval <= 365)) throw bad('recurrence interval invalid', { recurrence: 'Invalid interval' });
        return JSON.stringify({ freq: r.freq, interval: r.interval ?? 1, ...(r.until ? { until: r.until } : {}), ...(Number.isInteger(r.anchor) && r.anchor >= 1 && r.anchor <= 31 ? { anchor: r.anchor } : {}) });
      }
      return s;
    }
    case 'ref': {
      if (typeof v !== 'string') throw bad(`${key} must be an id`, { [key]: 'Invalid reference' });
      const hit = db.prepare(`SELECT 1 FROM ${f.to} WHERE id = ? AND user_id = ?`).get(v, userId);
      if (!hit) throw bad(`${key} refers to something that doesn't exist`, { [key]: 'Not found' });
      return v;
    }
  }
}

function buildValues(userId, name, input, { create, allowSystem = false }) {
  const spec = ENTITIES[name];
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw bad('Body must be a JSON object');
  const out = {};
  for (const [key, f] of Object.entries(spec.fields)) {
    if (f.system && !allowSystem) continue;
    if (!(key in input)) {
      if (create) {
        if (f.req) throw bad(`${key} is required`, { [key]: 'Required' });
        if (f.def !== undefined) out[key] = f.t === 'bool' ? (f.def ? 1 : 0) : f.def;
      }
      continue;
    }
    out[key] = coerceField(userId, name, key, f, input[key]);
  }
  return out;
}

/* ---------------- serialization ---------------- */
export function hydrate(name, row) {
  if (!row) return row;
  const spec = ENTITIES[name];
  const o = { ...row };
  delete o.user_id;
  for (const [k, f] of Object.entries(spec.fields)) {
    if (f.t === 'json' && typeof o[k] === 'string') { try { o[k] = JSON.parse(o[k]); } catch { /* keep raw */ } }
    if (f.t === 'bool') o[k] = !!o[k];
  }
  return o;
}

/* ---------------- audit trail ---------------- */
export function logActivity(userId, entity, entityId, action, row, { actor = 'user', meta } = {}) {
  if (!TIMELINE_ENTITIES.has(entity) && entity !== 'agent_actions') return;
  db.prepare('INSERT INTO activity (id,user_id,entity,entity_id,action,title,domain,at,meta,actor) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(uid(), userId, entity, entityId, action, row ? String(titleOf(entity, row)).slice(0, 200) : null, row?.domain ?? null, now(), meta ? JSON.stringify(meta) : null, actor);
}

/* ---------------- queries ---------------- */
const dbVals = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === undefined ? null : v]));

export function getRaw(userId, name, id) {
  return db.prepare(`SELECT * FROM ${name} WHERE id = ? AND user_id = ?`).get(id, userId);
}
export function get(userId, name, id) {
  const r = getRaw(userId, name, id);
  if (!r) throw new HttpError(404, `${ENTITIES[name].label} not found`);
  return hydrate(name, r);
}

/**
 * list(): filters apply only to declared columns. `status` and other values accept comma lists.
 * range: { field, from, to } filters an ISO/day column. Pagination via limit/offset (max 500).
 */
export function list(userId, name, opts = {}) {
  const spec = ENTITIES[name];
  const where = ['user_id = ?']; const params = [userId];
  if (!opts.archived) where.push('archived_at IS NULL');
  for (const [k, v] of Object.entries(opts.filters ?? {})) {
    if (v === undefined || v === '') continue;
    if (k !== 'id' && !(k in spec.fields)) throw bad(`Unknown filter ${k}`);
    if (v === 'null') { where.push(`${k} IS NULL`); continue; }
    if (v === '!null') { where.push(`${k} IS NOT NULL`); continue; }
    const vals = String(v).split(',');
    where.push(`${k} IN (${vals.map(() => '?').join(',')})`); params.push(...vals);
  }
  if (opts.range?.field) {
    if (!(opts.range.field in spec.fields)) throw bad('Unknown range field');
    if (opts.range.from) { where.push(`${opts.range.field} >= ?`); params.push(opts.range.from); }
    if (opts.range.to) { where.push(`${opts.range.field} < ?`); params.push(opts.range.to); }
  }
  if (opts.q) {
    const cols = spec.search ?? [];
    if (cols.length) { where.push(`(${cols.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ')})`); const like = `%${String(opts.q).replace(/[\\%_]/g, (m) => `\\${m}`)}%`; cols.forEach(() => params.push(like)); }
  }
  let order = 'created_at DESC';
  if (opts.sort) {
    const [col, dir] = String(opts.sort).split(':');
    if (col === 'created_at' || col === 'updated_at' || col in spec.fields) order = `${col} ${dir === 'desc' ? 'DESC' : 'ASC'}${col in spec.fields ? ' NULLS LAST' : ''}`;
  }
  const limit = Math.min(Math.max(Number(opts.limit) || 200, 1), 500);
  const offset = Math.max(Number(opts.offset) || 0, 0);
  const total = db.prepare(`SELECT COUNT(*) c FROM ${name} WHERE ${where.join(' AND ')}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM ${name} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).all(...params).map((r) => hydrate(name, r));
  return { items: rows, total, limit, offset };
}
export const all = (userId, name, extra = {}) => list(userId, name, { limit: 500, ...extra }).items;

/* ---------------- mutations ---------------- */
export function create(userId, name, input, ctx = {}) {
  return tx(() => {
    const vals = buildValues(userId, name, input, { create: true, allowSystem: ctx.allowSystem });
    const id = uid(); const t = now();
    const row = dbVals({ id, user_id: userId, created_at: t, updated_at: t, archived_at: null, ...vals });
    // Fill every column so inserts are explicit
    for (const k of Object.keys(ENTITIES[name].fields)) if (!(k in row)) row[k] = null;
    const cols = Object.keys(row);
    try {
      db.prepare(`INSERT INTO ${name} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c]));
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new HttpError(409, `${ENTITIES[name].label} already exists for that period`);
      throw e;
    }
    const out = hydrate(name, getRaw(userId, name, id));
    logActivity(userId, name, id, 'created', out, ctx);
    return out;
  });
}

export function update(userId, name, id, patch, ctx = {}) {
  return tx(() => {
    const before = getRaw(userId, name, id);
    if (!before) throw new HttpError(404, `${ENTITIES[name].label} not found`);
    const vals = buildValues(userId, name, patch, { create: false, allowSystem: ctx.allowSystem });
    const keys = Object.keys(vals);
    if (!keys.length) return hydrate(name, before);
    guardCycles(userId, name, id, vals);
    db.prepare(`UPDATE ${name} SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`).run(...keys.map((k) => dbVals(vals)[k]), now(), id, userId);
    const after = hydrate(name, getRaw(userId, name, id));
    const moved = ['due_at', 'start_at', 'end_at', 'exam_at'].some((k) => k in vals && vals[k] !== before[k]);
    logActivity(userId, name, id, moved ? 'rescheduled' : 'edited', after, { ...ctx, meta: { changed: keys, before: Object.fromEntries(keys.map((k) => [k, before[k]])) } });
    return after;
  });
}

function guardCycles(userId, name, id, vals) {
  if (name === 'tasks' && vals.parent_id) {
    if (vals.parent_id === id) throw bad('A task cannot be its own parent');
  }
  if (name === 'task_dependencies' && vals.task_id === vals.depends_on_id) throw bad('A task cannot depend on itself');
}

export function archive(userId, name, id, ctx = {}) {
  return tx(() => {
    const r = getRaw(userId, name, id); if (!r) throw new HttpError(404, 'Not found');
    db.prepare(`UPDATE ${name} SET archived_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`).run(now(), now(), id, userId);
    const out = hydrate(name, getRaw(userId, name, id)); logActivity(userId, name, id, 'archived', out, ctx); return out;
  });
}
export function restore(userId, name, id, ctx = {}) {
  return tx(() => {
    const r = getRaw(userId, name, id); if (!r) throw new HttpError(404, 'Not found');
    db.prepare(`UPDATE ${name} SET archived_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`).run(now(), id, userId);
    const out = hydrate(name, getRaw(userId, name, id)); logActivity(userId, name, id, 'restored', out, ctx); return out;
  });
}
/** Permanent deletion. Dependent references are cleared in the same transaction. */
export function remove(userId, name, id, ctx = {}) {
  return tx(() => {
    const r = getRaw(userId, name, id); if (!r) throw new HttpError(404, 'Not found');
    for (const [other, spec] of Object.entries(ENTITIES)) {
      for (const [k, f] of Object.entries(spec.fields)) {
        if (f.t === 'ref' && f.to === name) {
          if (f.req) db.prepare(`DELETE FROM ${other} WHERE ${k} = ? AND user_id = ?`).run(id, userId);
          else db.prepare(`UPDATE ${other} SET ${k} = NULL WHERE ${k} = ? AND user_id = ?`).run(id, userId);
        }
      }
    }
    db.prepare(`DELETE FROM ${name} WHERE id = ? AND user_id = ?`).run(id, userId);
    logActivity(userId, name, id, 'deleted', hydrate(name, r), ctx);
    return { id, deleted: true };
  });
}

export function complete(userId, name, id, ctx = {}) {
  const spec = ENTITIES[name];
  if (!spec.completion) throw bad(`${spec.label} cannot be completed`);
  return tx(() => {
    const raw = getRaw(userId, name, id); if (!raw) throw new HttpError(404, 'Not found');
    const c = spec.completion; const t = now(); const set = {};
    if (c.at) set[c.at] = t;
    if (c.status) set[c.status] = c.done;
    if (c.at && raw[c.at] && !c.status) return hydrate(name, raw); // already done
    const keys = Object.keys(set);
    db.prepare(`UPDATE ${name} SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`).run(...keys.map((k) => set[k]), t, id, userId);
    const out = hydrate(name, getRaw(userId, name, id));
    logActivity(userId, name, id, 'completed', out, ctx);
    // Recurring tasks/deadlines roll forward to the next occurrence (timezone/DST-correct).
    if ((name === 'tasks' || name === 'deadlines') && raw.recurrence && raw.due_at) {
      const tzUse = raw.tz || userTz(userId); const rule = JSON.parse(raw.recurrence);
      // Remember the intended day-of-month so Jan 31 → Feb 29 → Mar 31 (not Mar 29).
      if ((rule.freq === 'monthly' || rule.freq === 'yearly') && !rule.anchor) rule.anchor = parts(new Date(raw.due_at), tzUse).d;
      const next = nextOccurrence(raw.due_at, rule, tzUse);
      if (next) {
        const copy = hydrate(name, raw); copy.recurrence = rule;
        for (const k of ['id', 'created_at', 'updated_at', 'archived_at', 'done_at', 'completed_at']) delete copy[k];
        copy.due_at = next.toISOString(); if ('status' in copy) copy.status = 'open';
        create(userId, name, copy, { ...ctx, allowSystem: false });
      }
    }
    return out;
  });
}
export function reopen(userId, name, id, ctx = {}) {
  const spec = ENTITIES[name];
  if (!spec.completion) throw bad(`${spec.label} cannot be reopened`);
  return tx(() => {
    const raw = getRaw(userId, name, id); if (!raw) throw new HttpError(404, 'Not found');
    const c = spec.completion; const set = {};
    if (c.at) set[c.at] = null; if (c.status) set[c.status] = c.open;
    const keys = Object.keys(set);
    db.prepare(`UPDATE ${name} SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`).run(...keys.map((k) => set[k]), now(), id, userId);
    const out = hydrate(name, getRaw(userId, name, id)); logActivity(userId, name, id, 'reopened', out, ctx); return out;
  });
}

export function saveSettings(userId, patch) {
  const cur = getSettings(userId);
  const next = { ...cur };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    if (k === 'timezone' && !validTz(v)) throw bad('Unknown timezone', { timezone: 'Invalid timezone' });
    if (k === 'weekStart' && ![0, 1, 6].includes(v)) throw bad('weekStart must be 0, 1 or 6');
    if (['workStart', 'workEnd'].includes(k) && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw bad(`${k} must be HH:MM`);
    if (k === 'bufferMin' && !(Number.isInteger(v) && v >= 0 && v <= 240)) throw bad('bufferMin must be 0–240');
    if (k === 'workDays' && !(Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))) throw bad('workDays invalid');
    if (k === 'theme' && !['dark', 'light', 'system'].includes(v)) throw bad('Invalid theme');
    if (k === 'density' && !['comfortable', 'compact'].includes(v)) throw bad('Invalid density');
    if (k === 'motion' && !['system', 'reduced', 'full'].includes(v)) throw bad('Invalid motion');
    if (k === 'language' && !/^[a-z]{2}(-[A-Z]{2})?$/.test(v)) throw bad('Invalid language');
    if (k === 'recentSearches' && !(Array.isArray(v) && v.length <= 12 && v.every((s) => typeof s === 'string' && s.length < 100))) throw bad('Invalid recent searches');
    next[k] = typeof DEFAULT_SETTINGS[k] === 'object' && !Array.isArray(DEFAULT_SETTINGS[k]) ? { ...cur[k], ...v } : v;
  }
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(next), userId);
  return next;
}
