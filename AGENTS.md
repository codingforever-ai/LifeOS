# LifeOS — agent notes

- Stack: Vite + React 18 + TypeScript + react-router-dom. No backend, no DB, no secrets in Phase 1.
- Run: `docker compose -f docker-compose.base44.yml up -d` (port 3000). Checks: `npm run typecheck`, `npm run build`.
- **No gamification, ever** (XP, levels, coins, streak rewards, quests…). Progress = goals, milestones, trends, consistency.
- One Core model (`src/core/types.ts`): Goal → Project → Milestone → Task, plus CalendarEntry. Domains tag records with `domain`; they never define their own Task/Goal/Project/Event. Progress is *derived* (`src/core/progress.ts`) — never store a `progress` field.
- Demo data lives only in `src/data/demo.ts`; real data replaces the `CoreProvider` store (`src/core/store.tsx`).
- Add a module: feature folder in `src/features/`, lazy route in `src/App.tsx`, nav entry in `src/shell/nav.ts`. Add a domain: one entry in `src/core/domains.ts`.
- Reuse `src/ui/*` primitives (BubbleIcon, Button, Surface, Row, Overlay, Menu, Tabs, states). Tokens in `src/styles/tokens.css`. Motion uses CSS only and must respect `prefers-reduced-motion` (handled globally in `base.css`).
- **`EntityForm` owns form state for every entity dialog — keep its init effect deps identity-stable.** `defaults` is normally an inline object literal, so it is keyed on a JSON signature, and the effect keys on `record.id`, never the `record` object. Putting the raw object back into the deps makes the effect re-run on every render, which resets the form state continuously ("Maximum update depth exceeded") and makes every field impossible to type into.
- Sidebar hierarchy lives in `src/shell/nav.ts`: `NAV_GROUPS` = Today → Plan → Do & Measure → Understand → Remember → Utility. `EXTRA_NAV` holds entries reachable outside the desktop sidebar (Agent, via the Today dashboard card and the phone tab bar). Sidebar CSS is in `src/styles/shell.css` (icon rail ≥768px, full sidebar ≥1024px).
- Agent UI contract is `src/features/agent/contract.ts`; `demoAgent.ts` is scripted and must stay clearly labelled demo.
- Holidays live in **one** registry: `src/features/calendar/holidays.ts` (India / Telangana, 2026–2031, built once at module load — no fetching). Add or fix dates there only; the calendar highlight, the selected-day note and `UpcomingHolidays` all read the same records. `isTentative` marks moon-sighting / not-yet-notified dates; `category: 'regional'` stays on the calendar but is kept out of the "next 3" countdown.
- Red is reserved for holiday dates (`--holiday*` tokens in `tokens.css`); holiday cell styling lives at the end of the Calendar block in `pages.css`. Keep the holiday rules after the today/selected rules — equal specificity, so source order decides.
- Preview helper: `/tasks?state=loading|error|empty`.
