import { Badge, Surface, Section } from '../../ui/primitives';
import { CATEGORY_LABEL, upcomingHolidays } from './holidays';

/** `2026-10-11` → `11/10/2026` (dd/mm/yyyy, as used in the LifeOS reference design). */
const dmy = (key: string) => {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * The next three holidays counted from the real current date. Holiday data comes from the
 * central registry (`./holidays`) — no emojis, no per-render fetches.
 */
export function UpcomingHolidays({ from, onPick }: { from: string; onPick: (date: string) => void }) {
  const list = upcomingHolidays(from, 3);
  if (list.length === 0) return null;

  return (
    <Section title="Upcoming holidays">
      <Surface pad="none" className="holiday-panel">
        <ul className="holiday-list">
          {list.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="holiday-item"
                onClick={() => onPick(h.date)}
                aria-label={`${h.name}, ${dmy(h.date)}, ${CATEGORY_LABEL[h.category]}. Show on the calendar.`}
              >
                <span className="holiday-row">
                  <span className="holiday-date num">{dmy(h.date)}</span>
                  {h.isTentative && <Badge tone="warn">Tentative</Badge>}
                </span>
                <span className="holiday-title">{h.name}</span>
                <span className="holiday-kind">{CATEGORY_LABEL[h.category]}</span>
              </button>
            </li>
          ))}
        </ul>
      </Surface>
    </Section>
  );
}
