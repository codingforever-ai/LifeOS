# LifeOS — agent notes

- Stack: Vite + React 18 + TypeScript + react-router-dom. No backend, no DB, no secrets in Phase 1.
- Run: `docker compose -f docker-compose.base44.yml up -d` (port 3000). Checks: `npm run typecheck`, `npm run build`.
- **No gamification, ever** (XP, levels, coins, streak rewards, quests…). Progress = goals, milestones, trends, consistency.
- One Core model (`src/core/types.ts`): Goal → Project → Milestone → Task, plus CalendarEntry. Domains tag records with `domain`; they never define their own Task/Goal/Project/Event. Progress is *derived* (`src/core/progress.ts`) — never store a `progress` field.
- Demo data lives only in `src/data/demo.ts`; real data replaces the `CoreProvider` store (`src/core/store.tsx`).
- Add a module: feature folder in `src/features/`, lazy route in `src/App.tsx`, nav entry in `src/shell/nav.ts`. Add a domain: one entry in `src/core/domains.ts`.
- Reuse `src/ui/*` primitives (BubbleIcon, Button, Surface, Row, Overlay, Menu, Tabs, states). Tokens in `src/styles/tokens.css`. Motion uses CSS only and must respect `prefers-reduced-motion` (handled globally in `base.css`).
- Agent UI contract is `src/features/agent/contract.ts`; `demoAgent.ts` is scripted and must stay clearly labelled demo.
- Preview helper: `/tasks?state=loading|error|empty`.
