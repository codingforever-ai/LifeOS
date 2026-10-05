import type { ReactNode } from 'react';
import { ErrorState, LoadingState } from '../../ui/primitives';

/** Shared loading / error / content wrapper for any useApi() result. */
export function Async<T>({ q, children, label }: { q: { data: T | null; loading: boolean; error: string | null; reload: () => void }; children: (d: T) => ReactNode; label?: string }) {
  if (q.data) return <>{children(q.data)}</>;
  if (q.error) return <ErrorState text={q.error} onRetry={q.reload} />;
  return <LoadingState label={label ?? 'Loading'} />;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'warn' | 'ok' | 'danger' }) {
  return (
    <div className="stat" data-tone={tone}>
      <div className="caption">{label}</div>
      <div className="stat-value num">{value}</div>
      {sub && <div className="faint small">{sub}</div>}
    </div>
  );
}
export const StatGrid = ({ children }: { children: ReactNode }) => <div className="stat-grid">{children}</div>;

export const pctOf = (v: number | null | undefined) => `${Math.round((v ?? 0) * 100)}%`;
export const label = (s: string | null | undefined) => (s ? String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '');
