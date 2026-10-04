/** Progress is DERIVED on the server from tasks/milestones (server/derive.mjs). The client only formats it. */
export const pct = (v: number | undefined | null) => Math.round((v ?? 0) * 100);
