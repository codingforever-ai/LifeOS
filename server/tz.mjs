/** Timezone-correct date helpers (no hardcoded offsets; DST, leap years and month ends handled via Intl + calendar math). */
const dtfCache = new Map();
function dtf(tz) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
    dtfCache.set(tz, f);
  }
  return f;
}
export const validTz = (tz) => { try { dtf(tz); return true; } catch { return false; } };

const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
/** Wall-clock parts of an instant in a timezone. */
export function parts(date, tz = 'UTC') {
  const o = {};
  for (const p of dtf(tz).formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second, dow: WD[o.weekday] };
}
const offsetMs = (ms, tz) => { const p = parts(new Date(ms), tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000; };

/** Convert a wall-clock time in `tz` to a UTC Date (DST-aware; gaps resolve forward). */
export function zonedToUtc({ y, m, d, h = 0, mi = 0 }, tz = 'UTC') {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);
  return new Date(t);
}
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (date, tz = 'UTC') => { const p = parts(date, tz); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return { y, m, d }; };
export function addDays(key, n) { const { y, m, d } = parseDay(key); const t = new Date(Date.UTC(y, m - 1, d + n)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; }
export const dowOf = (key) => { const { y, m, d } = parseDay(key); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
export const diffDayKeys = (a, b) => Math.round((Date.UTC(...Object.values(parseDay(a)).map((v, i) => (i === 1 ? v - 1 : v))) - Date.UTC(...Object.values(parseDay(b)).map((v, i) => (i === 1 ? v - 1 : v)))) / 86400000);
export const startOfDay = (key, tz) => zonedToUtc({ ...parseDay(key) }, tz);
export const endOfDay = (key, tz) => startOfDay(addDays(key, 1), tz);
export const weekStartKey = (key, weekStart = 1) => addDays(key, -((dowOf(key) - weekStart + 7) % 7));

/** Next occurrence for a recurrence rule, preserving wall-clock time in tz. Month ends clamp (Jan 31 → Feb 28/29). */
export function nextOccurrence(iso, rule, tz = 'UTC', k = 1) {
  if (!rule || !rule.freq) return null;
  const n = Math.max(1, Math.min(365, rule.interval ?? 1)) * k;
  const p = parts(new Date(iso), tz);
  let { y, m, d } = p;
  if (rule.freq === 'daily') { const k = addDays(`${y}-${pad(m)}-${pad(d)}`, n); ({ y, m, d } = parseDay(k)); }
  else if (rule.freq === 'weekly') { const k = addDays(`${y}-${pad(m)}-${pad(d)}`, 7 * n); ({ y, m, d } = parseDay(k)); }
  else if (rule.freq === 'monthly') { const total = y * 12 + (m - 1) + n; y = Math.floor(total / 12); m = (total % 12) + 1; d = Math.min(rule.anchor ?? p.d, daysInMonth(y, m)); }
  else if (rule.freq === 'yearly') { y += n; d = Math.min(rule.anchor ?? d, daysInMonth(y, m)); }
  else return null;
  const next = zonedToUtc({ y, m, d, h: p.h, mi: p.mi }, tz);
  if (rule.until && dayKey(next, tz) > rule.until) return null;
  return next;
}

/** Expand a recurring item into occurrences within [from, to). */
export function expandRecurrence(startIso, durationMs, rule, from, to, tz = 'UTC', cap = 400) {
  const out = [];
  let cur = new Date(startIso);
  for (let i = 0; i < cap && cur < to; i++) {
    if (cur.getTime() + durationMs > from.getTime()) out.push(new Date(cur));
    if (!rule?.freq) break;
    const nx = nextOccurrence(startIso, rule, tz, i + 1); // always from the base so month-end clamping never drifts
    if (!nx || nx <= cur) break;
    cur = nx;
  }
  return out;
}
