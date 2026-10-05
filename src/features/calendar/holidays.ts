/**
 * LifeOS holiday registry — the single source of truth for holiday dates.
 *
 * Scope: India with Telangana as the regional context (national holidays + major
 * festivals + Telangana public/regional holidays). Years covered: 2026–2031.
 *
 * Sources
 *  - `tg` : Government of Telangana, General Holidays 2026 (G.A. Spl.E) — authoritative
 *           for Telangana public holidays in 2026.
 *  - `in` : India national holiday calendars (timeanddate.com), cross-checked against
 *           qppstudio.net (Telangana 2026–2027), Drik Panchang and Prokerala for the
 *           movable/lunar festivals.
 *
 * Fixed Gregorian holidays (Republic Day, Independence Day, Gandhi Jayanti, Christmas,
 * Ambedkar Jayanti) are exact. Movable festivals are the dates published by the sources
 * above; Islamic observances and far-future festival dates are moon/panchang dependent,
 * so records that are not yet officially notified carry `isTentative: true`.
 *
 * Never scatter holiday dates in UI components — add them here and both the calendar
 * highlight and the Upcoming holidays panel pick them up automatically.
 */

export type HolidayCategory = 'national' | 'festival' | 'regional';
export type HolidayRegion = 'IN' | 'TS';

export interface Holiday {
  id: string;
  name: string;
  /** Calendar day in the user's timezone, `YYYY-MM-DD`. */
  date: string;
  year: number;
  category: HolidayCategory;
  region: HolidayRegion;
  isNational: boolean;
  isFestival: boolean;
  isPublicHoliday: boolean;
  /** The date may shift (moon sighting / panchang) or is not officially notified yet. */
  isTentative: boolean;
  source: string;
  sourceUrl: string;
}

type SourceKey = 'tg' | 'in';

const SOURCES: Record<SourceKey, { source: string; sourceUrl: string }> = {
  tg: {
    source: 'Government of Telangana — General Holidays 2026 (G.A. Spl.E)',
    sourceUrl: 'https://tggazette.cgg.gov.in/viewDocument/1769753367122',
  },
  in: {
    source: 'India holiday calendar (timeanddate.com), cross-checked with qppstudio.net / Drik Panchang',
    sourceUrl: 'https://www.timeanddate.com/holidays/india/',
  },
};

interface Seed {
  /** `YYYY-MM-DD` */
  d: string;
  n: string;
  c: HolidayCategory;
  /** Observed as a public/office holiday (Telangana). */
  publicHoliday?: boolean;
  tentative?: boolean;
  s?: SourceKey;
}

/** Category text shown in the UI. */
export const CATEGORY_LABEL: Record<HolidayCategory, string> = {
  national: 'National holiday',
  festival: 'Festival',
  regional: 'Regional holiday',
};

const SEEDS: Seed[] = [
  /* ---------- 2026 ---------- */
  { d: '2026-01-14', n: 'Bhogi', c: 'regional', publicHoliday: true, s: 'tg' },
  { d: '2026-01-15', n: 'Sankranti / Pongal', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-01-23', n: 'Vasant Panchami', c: 'festival', s: 'tg' },
  { d: '2026-01-26', n: 'Republic Day', c: 'national', publicHoliday: true, s: 'tg' },
  { d: '2026-02-15', n: 'Maha Shivaratri', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-03-03', n: 'Holi', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-03-19', n: 'Ugadi', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-03-21', n: 'Eid al-Fitr (Ramzan)', c: 'festival', publicHoliday: true, tentative: true, s: 'tg' },
  { d: '2026-03-27', n: 'Sri Rama Navami', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-04-03', n: 'Good Friday', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-04-14', n: 'Dr. B. R. Ambedkar Jayanti', c: 'national', publicHoliday: true, s: 'tg' },
  { d: '2026-05-27', n: 'Eid al-Adha (Bakrid)', c: 'festival', publicHoliday: true, tentative: true, s: 'tg' },
  { d: '2026-06-26', n: 'Muharram', c: 'festival', publicHoliday: true, tentative: true, s: 'tg' },
  { d: '2026-07-16', n: 'Rath Yatra', c: 'festival' },
  { d: '2026-08-10', n: 'Bonalu', c: 'regional', publicHoliday: true, s: 'tg' },
  { d: '2026-08-15', n: 'Independence Day', c: 'national', publicHoliday: true, s: 'tg' },
  { d: '2026-08-26', n: 'Milad-un-Nabi', c: 'festival', publicHoliday: true, tentative: true, s: 'tg' },
  { d: '2026-08-28', n: 'Raksha Bandhan', c: 'festival' },
  { d: '2026-09-04', n: 'Sri Krishna Janmashtami', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-09-14', n: 'Ganesh Chaturthi (Vinayaka Chavithi)', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-10-02', n: 'Mahatma Gandhi Jayanti', c: 'national', publicHoliday: true, s: 'tg' },
  { d: '2026-10-11', n: 'Sharad Navratri begins', c: 'festival' },
  { d: '2026-10-18', n: 'Saddula Bathukamma', c: 'regional', publicHoliday: true, s: 'tg' },
  { d: '2026-10-20', n: 'Dussehra / Vijaya Dasami', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-11-08', n: 'Diwali / Deepavali', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-11-24', n: 'Guru Nanak Jayanti', c: 'festival', publicHoliday: true, s: 'tg' },
  { d: '2026-12-25', n: 'Christmas', c: 'festival', publicHoliday: true, s: 'tg' },

  /* ---------- 2027 ---------- */
  { d: '2027-01-14', n: 'Sankranti / Pongal', c: 'festival', publicHoliday: true },
  { d: '2027-01-26', n: 'Republic Day', c: 'national', publicHoliday: true },
  { d: '2027-02-11', n: 'Vasant Panchami', c: 'festival' },
  { d: '2027-03-06', n: 'Maha Shivaratri', c: 'festival', publicHoliday: true },
  { d: '2027-03-10', n: 'Eid al-Fitr (Ramzan)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2027-03-22', n: 'Holi', c: 'festival', publicHoliday: true },
  { d: '2027-03-26', n: 'Good Friday', c: 'festival', publicHoliday: true },
  { d: '2027-04-07', n: 'Ugadi', c: 'festival', publicHoliday: true },
  { d: '2027-04-14', n: 'Dr. B. R. Ambedkar Jayanti', c: 'national', publicHoliday: true },
  { d: '2027-04-15', n: 'Sri Rama Navami', c: 'festival', publicHoliday: true },
  { d: '2027-05-17', n: 'Eid al-Adha (Bakrid)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2027-06-16', n: 'Muharram', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2027-07-05', n: 'Rath Yatra', c: 'festival' },
  { d: '2027-08-02', n: 'Bonalu', c: 'regional', publicHoliday: true, tentative: true },
  { d: '2027-08-15', n: 'Independence Day', c: 'national', publicHoliday: true },
  { d: '2027-08-15', n: 'Milad-un-Nabi', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2027-08-17', n: 'Raksha Bandhan', c: 'festival' },
  { d: '2027-08-25', n: 'Sri Krishna Janmashtami', c: 'festival', publicHoliday: true },
  { d: '2027-09-04', n: 'Ganesh Chaturthi (Vinayaka Chavithi)', c: 'festival', publicHoliday: true },
  { d: '2027-09-30', n: 'Sharad Navratri begins', c: 'festival' },
  { d: '2027-10-02', n: 'Mahatma Gandhi Jayanti', c: 'national', publicHoliday: true },
  { d: '2027-10-09', n: 'Dussehra / Vijaya Dasami', c: 'festival', publicHoliday: true },
  { d: '2027-10-29', n: 'Diwali / Deepavali', c: 'festival', publicHoliday: true },
  { d: '2027-11-14', n: 'Guru Nanak Jayanti', c: 'festival', publicHoliday: true },
  { d: '2027-12-25', n: 'Christmas', c: 'festival', publicHoliday: true },

  /* ---------- 2028 ---------- */
  { d: '2028-01-15', n: 'Sankranti / Pongal', c: 'festival', publicHoliday: true },
  { d: '2028-01-26', n: 'Republic Day', c: 'national', publicHoliday: true },
  { d: '2028-01-31', n: 'Vasant Panchami', c: 'festival' },
  { d: '2028-02-23', n: 'Maha Shivaratri', c: 'festival', publicHoliday: true },
  { d: '2028-02-27', n: 'Eid al-Fitr (Ramzan)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2028-03-11', n: 'Holi', c: 'festival', publicHoliday: true },
  { d: '2028-03-27', n: 'Ugadi', c: 'festival', publicHoliday: true },
  { d: '2028-04-03', n: 'Sri Rama Navami', c: 'festival', publicHoliday: true },
  { d: '2028-04-14', n: 'Dr. B. R. Ambedkar Jayanti', c: 'national', publicHoliday: true },
  { d: '2028-04-14', n: 'Good Friday', c: 'festival', publicHoliday: true },
  { d: '2028-05-06', n: 'Eid al-Adha (Bakrid)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2028-06-04', n: 'Muharram', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2028-06-24', n: 'Rath Yatra', c: 'festival' },
  { d: '2028-08-04', n: 'Milad-un-Nabi', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2028-08-05', n: 'Raksha Bandhan', c: 'festival' },
  { d: '2028-08-13', n: 'Sri Krishna Janmashtami', c: 'festival', publicHoliday: true },
  { d: '2028-08-15', n: 'Independence Day', c: 'national', publicHoliday: true },
  { d: '2028-08-23', n: 'Ganesh Chaturthi (Vinayaka Chavithi)', c: 'festival', publicHoliday: true },
  { d: '2028-09-19', n: 'Sharad Navratri begins', c: 'festival' },
  { d: '2028-09-27', n: 'Dussehra / Vijaya Dasami', c: 'festival', publicHoliday: true },
  { d: '2028-10-02', n: 'Mahatma Gandhi Jayanti', c: 'national', publicHoliday: true },
  { d: '2028-10-17', n: 'Diwali / Deepavali', c: 'festival', publicHoliday: true },
  { d: '2028-11-02', n: 'Guru Nanak Jayanti', c: 'festival', publicHoliday: true },
  { d: '2028-12-25', n: 'Christmas', c: 'festival', publicHoliday: true },

  /* ---------- 2029 ---------- */
  { d: '2029-01-14', n: 'Sankranti / Pongal', c: 'festival', publicHoliday: true },
  { d: '2029-01-26', n: 'Republic Day', c: 'national', publicHoliday: true },
  { d: '2029-01-19', n: 'Vasant Panchami', c: 'festival' },
  { d: '2029-02-11', n: 'Maha Shivaratri', c: 'festival', publicHoliday: true },
  { d: '2029-02-15', n: 'Eid al-Fitr (Ramzan)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2029-03-01', n: 'Holi', c: 'festival', publicHoliday: true },
  { d: '2029-03-30', n: 'Good Friday', c: 'festival', publicHoliday: true },
  { d: '2029-04-14', n: 'Ugadi', c: 'festival', publicHoliday: true },
  { d: '2029-04-14', n: 'Dr. B. R. Ambedkar Jayanti', c: 'national', publicHoliday: true },
  { d: '2029-04-22', n: 'Sri Rama Navami', c: 'festival', publicHoliday: true },
  { d: '2029-04-25', n: 'Eid al-Adha (Bakrid)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2029-05-25', n: 'Muharram', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2029-07-13', n: 'Rath Yatra', c: 'festival' },
  { d: '2029-07-24', n: 'Milad-un-Nabi', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2029-08-15', n: 'Independence Day', c: 'national', publicHoliday: true },
  { d: '2029-08-23', n: 'Raksha Bandhan', c: 'festival' },
  { d: '2029-09-01', n: 'Sri Krishna Janmashtami', c: 'festival', publicHoliday: true },
  { d: '2029-09-11', n: 'Ganesh Chaturthi (Vinayaka Chavithi)', c: 'festival', publicHoliday: true },
  { d: '2029-10-02', n: 'Mahatma Gandhi Jayanti', c: 'national', publicHoliday: true },
  { d: '2029-10-08', n: 'Sharad Navratri begins', c: 'festival' },
  { d: '2029-10-16', n: 'Dussehra / Vijaya Dasami', c: 'festival', publicHoliday: true },
  { d: '2029-11-05', n: 'Diwali / Deepavali', c: 'festival', publicHoliday: true },
  { d: '2029-11-21', n: 'Guru Nanak Jayanti', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2029-12-25', n: 'Christmas', c: 'festival', publicHoliday: true },

  /* ---------- 2030 ---------- */
  { d: '2030-01-14', n: 'Sankranti / Pongal', c: 'festival', publicHoliday: true },
  { d: '2030-01-26', n: 'Republic Day', c: 'national', publicHoliday: true },
  { d: '2030-02-05', n: 'Eid al-Fitr (Ramzan)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2030-02-07', n: 'Vasant Panchami', c: 'festival' },
  { d: '2030-03-02', n: 'Maha Shivaratri', c: 'festival', publicHoliday: true },
  { d: '2030-03-20', n: 'Holi', c: 'festival', publicHoliday: true },
  { d: '2030-04-03', n: 'Ugadi', c: 'festival', publicHoliday: true },
  { d: '2030-04-12', n: 'Sri Rama Navami', c: 'festival', publicHoliday: true },
  { d: '2030-04-14', n: 'Dr. B. R. Ambedkar Jayanti', c: 'national', publicHoliday: true },
  { d: '2030-04-14', n: 'Eid al-Adha (Bakrid)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2030-04-19', n: 'Good Friday', c: 'festival', publicHoliday: true },
  { d: '2030-05-14', n: 'Muharram', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2030-07-02', n: 'Rath Yatra', c: 'festival' },
  { d: '2030-07-13', n: 'Milad-un-Nabi', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2030-08-13', n: 'Raksha Bandhan', c: 'festival' },
  { d: '2030-08-15', n: 'Independence Day', c: 'national', publicHoliday: true },
  { d: '2030-08-21', n: 'Sri Krishna Janmashtami', c: 'festival', publicHoliday: true },
  { d: '2030-09-01', n: 'Ganesh Chaturthi (Vinayaka Chavithi)', c: 'festival', publicHoliday: true },
  { d: '2030-09-28', n: 'Sharad Navratri begins', c: 'festival' },
  { d: '2030-10-02', n: 'Mahatma Gandhi Jayanti', c: 'national', publicHoliday: true },
  { d: '2030-10-06', n: 'Dussehra / Vijaya Dasami', c: 'festival', publicHoliday: true },
  { d: '2030-10-26', n: 'Diwali / Deepavali', c: 'festival', publicHoliday: true },
  { d: '2030-11-10', n: 'Guru Nanak Jayanti', c: 'festival', publicHoliday: true },
  { d: '2030-12-25', n: 'Christmas', c: 'festival', publicHoliday: true },

  /* ---------- 2031 ---------- */
  { d: '2031-01-15', n: 'Sankranti / Pongal', c: 'festival', publicHoliday: true },
  { d: '2031-01-25', n: 'Eid al-Fitr (Ramzan)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2031-01-26', n: 'Republic Day', c: 'national', publicHoliday: true },
  { d: '2031-01-27', n: 'Vasant Panchami', c: 'festival' },
  { d: '2031-02-20', n: 'Maha Shivaratri', c: 'festival', publicHoliday: true },
  { d: '2031-03-09', n: 'Holi', c: 'festival', publicHoliday: true },
  { d: '2031-03-24', n: 'Ugadi', c: 'festival', publicHoliday: true },
  { d: '2031-04-01', n: 'Sri Rama Navami', c: 'festival', publicHoliday: true },
  { d: '2031-04-03', n: 'Eid al-Adha (Bakrid)', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2031-04-11', n: 'Good Friday', c: 'festival', publicHoliday: true },
  { d: '2031-04-14', n: 'Dr. B. R. Ambedkar Jayanti', c: 'national', publicHoliday: true },
  { d: '2031-05-03', n: 'Muharram', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2031-06-22', n: 'Rath Yatra', c: 'festival' },
  { d: '2031-07-03', n: 'Milad-un-Nabi', c: 'festival', publicHoliday: true, tentative: true },
  { d: '2031-08-02', n: 'Raksha Bandhan', c: 'festival' },
  { d: '2031-08-10', n: 'Sri Krishna Janmashtami', c: 'festival', publicHoliday: true },
  { d: '2031-08-15', n: 'Independence Day', c: 'national', publicHoliday: true },
  { d: '2031-09-20', n: 'Ganesh Chaturthi (Vinayaka Chavithi)', c: 'festival', publicHoliday: true },
  { d: '2031-10-02', n: 'Mahatma Gandhi Jayanti', c: 'national', publicHoliday: true },
  { d: '2031-10-17', n: 'Sharad Navratri begins', c: 'festival' },
  { d: '2031-10-25', n: 'Dussehra / Vijaya Dasami', c: 'festival', publicHoliday: true },
  { d: '2031-11-14', n: 'Diwali / Deepavali', c: 'festival', publicHoliday: true },
  { d: '2031-11-28', n: 'Guru Nanak Jayanti', c: 'festival', publicHoliday: true },
  { d: '2031-12-25', n: 'Christmas', c: 'festival', publicHoliday: true },
];

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Every holiday record, sorted by date. Built once — no web requests, no per-render work. */
export const HOLIDAYS: Holiday[] = SEEDS.map((s) => ({
  id: `${s.d}-${slug(s.n)}`,
  name: s.n,
  date: s.d,
  year: Number(s.d.slice(0, 4)),
  category: s.c,
  region: s.c === 'regional' ? 'TS' as HolidayRegion : 'IN' as HolidayRegion,
  isNational: s.c === 'national',
  isFestival: s.c !== 'national',
  isPublicHoliday: !!s.publicHoliday,
  isTentative: !!s.tentative,
  ...SOURCES[s.s ?? 'in'],
})).sort((a, b) => a.date.localeCompare(b.date));

export const HOLIDAY_YEARS: number[] = [...new Set(HOLIDAYS.map((h) => h.year))];

const BY_DAY = new Map<string, Holiday[]>();
for (const h of HOLIDAYS) BY_DAY.set(h.date, [...(BY_DAY.get(h.date) ?? []), h]);

/** The holiday(s) on a `YYYY-MM-DD` day key, if any. O(1). */
export const holidaysOn = (dayKey: string): Holiday[] => BY_DAY.get(dayKey) ?? [];
export const isHoliday = (dayKey: string): boolean => BY_DAY.has(dayKey);

/**
 * The next `count` holidays from `fromKey` (the real current date — month navigation never
 * changes it). Regional-only observances stay highlighted on the calendar but are kept out of
 * the countdown, so the panel shows the festivals/national holidays people plan around.
 */
export function upcomingHolidays(fromKey: string, count = 3): Holiday[] {
  const out: Holiday[] = [];
  for (const h of HOLIDAYS) {
    if (h.date < fromKey || h.category === 'regional') continue;
    out.push(h);
    if (out.length === count) break;
  }
  return out;
}
