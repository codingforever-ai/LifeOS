/** Timezone helpers (user's chosen timezone, not the browser's). No hardcoded offsets. */
const cache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string) {
  let f = cache.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }); cache.set(tz, f); }
  return f;
}
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export interface Parts { y: number; m: number; d: number; h: number; mi: number; dow: number }
export function parts(date: Date, tz: string): Parts {
  const o: Record<string, string> = {};
  for (const p of dtf(tz).formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, dow: WD[o.weekday] };
}
const offsetMs = (ms: number, tz: string) => { const p = parts(new Date(ms), tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, 0) - Math.floor(ms / 60000) * 60000; };
export function zonedToUtc(p: { y: number; m: number; d: number; h?: number; mi?: number }, tz: string): Date {
  const guess = Date.UTC(p.y, p.m - 1, p.d, p.h ?? 0, p.mi ?? 0);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);
  return new Date(t);
}
const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date, tz: string) => { const p = parts(d, tz); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const parseDay = (k: string) => { const [y, m, d] = k.split('-').map(Number); return { y, m, d }; };
export const addDays = (k: string, n: number) => { const { y, m, d } = parseDay(k); const t = new Date(Date.UTC(y, m - 1, d + n)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
export const dowOf = (k: string) => { const { y, m, d } = parseDay(k); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
export const weekStart = (k: string, ws = 1) => addDays(k, -((dowOf(k) - ws + 7) % 7));
export const startOfDayUtc = (k: string, tz: string) => zonedToUtc(parseDay(k), tz);
export const monthStartKey = (k: string) => `${k.slice(0, 7)}-01`;
export const addMonths = (k: string, n: number) => { const { y, m } = parseDay(k); const t = new Date(Date.UTC(y, m - 1 + n, 1)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-01`; };
export const diffDays = (a: string, b: string) => Math.round((Date.UTC(...(Object.values(parseDay(a)) as [number, number, number]).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number]) - Date.UTC(...(Object.values(parseDay(b)) as [number, number, number]).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number])) / 86400000);

/** ISO instant → value for <input type=datetime-local> in `tz`. */
export function isoToInput(iso: string | null | undefined, tz: string, dateOnly = false) {
  if (!iso) return '';
  const p = parts(new Date(iso), tz);
  const d = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  return dateOnly ? d : `${d}T${pad(p.h)}:${pad(p.mi)}`;
}
/** <input type=datetime-local|date> value interpreted in `tz` → ISO instant. */
export function inputToIso(v: string, tz: string) {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  return zonedToUtc({ y: +m[1], m: +m[2], d: +m[3], h: m[4] ? +m[4] : 12, mi: m[5] ? +m[5] : 0 }, tz).toISOString();
}

export const fmt = {
  time: (iso: string, tz: string) => new Date(iso).toLocaleTimeString([], { timeZone: tz, hour: 'numeric', minute: '2-digit' }),
  date: (iso: string, tz: string) => new Date(iso).toLocaleDateString([], { timeZone: tz, month: 'short', day: 'numeric' }),
  dateLong: (iso: string, tz: string) => new Date(iso).toLocaleDateString([], { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' }),
  weekday: (iso: string, tz: string) => new Date(iso).toLocaleDateString([], { timeZone: tz, weekday: 'short' }),
  dateTime: (iso: string, tz: string) => new Date(iso).toLocaleString([], { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  dayKey: (k: string, o: Intl.DateTimeFormatOptions) => new Date(Date.UTC(...(Object.values(parseDay(k)) as [number, number, number]).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number], 12)).toLocaleDateString([], { timeZone: 'UTC', ...o }),
};
export const minutesLabel = (m: number) => { const a = Math.abs(Math.round(m)); return a >= 60 ? `${Math.floor(a / 60)}h${a % 60 ? ` ${a % 60}m` : ''}` : `${a}m`; };

/** "in 3 days", "today", "2 days overdue" relative to `tz` calendar days. */
export function relDay(iso: string, tz: string, now = new Date()) {
  const n = diffDays(dayKey(new Date(iso), tz), dayKey(now, tz));
  if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}
export function countdown(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now; const a = Math.abs(ms);
  const d = Math.floor(a / 864e5); const h = Math.floor((a % 864e5) / 36e5); const m = Math.floor((a % 36e5) / 6e4);
  const txt = d >= 1 ? `${d}d ${h}h` : h >= 1 ? `${h}h ${m}m` : `${m}m`;
  return { text: ms < 0 ? `${txt} overdue` : `in ${txt}`, overdue: ms < 0, ms };
}
