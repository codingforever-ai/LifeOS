/**
 * LifeOS tactile icon system. One look: compact rounded-square tiles lit from the top-left, purple primary,
 * supporting tones for domains/status. All dimensions, radius, light and states come from tokens.css.
 */
import type { ReactNode } from 'react';
import { Icon, isIconName } from './Icon';
import type { IconName } from './Icon';
import { DOMAINS } from '../core/domains';

export { Icon, IconButton } from './primitives-icons';
export type Tone = 'purple' | 'royal' | 'lavender' | 'plum' | 'graphite' | 'slate' | 'mist' | 'sand';
export type TileSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function IconTile({ name, tone = 'purple', size = 'md', interactive, disabled }: { name: IconName | string; tone?: Tone | string; size?: TileSize; interactive?: boolean; disabled?: boolean }) {
  return (
    <span className="bubble" data-tone={tone} data-size={size} data-interactive={interactive ? '' : undefined} data-disabled={disabled ? '' : undefined}>
      {isIconName(name) && <Icon name={name} />}
    </span>
  );
}

/** Tile with a small count badge (alerts, inbox…). */
export function IconBadge({ name, tone, size, count }: { name: IconName; tone?: Tone; size?: TileSize; count?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <IconTile name={name} tone={tone} size={size} />
      {!!count && <span className="tile-badge" aria-label={`${count} new`}>{count > 99 ? '99+' : count}</span>}
    </span>
  );
}

export function DomainIcon({ domain, size = 'md' }: { domain: string; size?: TileSize }) {
  const d = DOMAINS.find((x) => x.id === domain);
  return <IconTile name={d?.icon ?? 'sparkle'} tone={d?.tone ?? 'graphite'} size={size} />;
}

const STATUS: Record<string, { icon: IconName; tone: Tone }> = {
  done: { icon: 'check', tone: 'mist' }, completed: { icon: 'check', tone: 'mist' }, healthy: { icon: 'check', tone: 'mist' }, applied: { icon: 'check', tone: 'mist' },
  active: { icon: 'play', tone: 'royal' }, running: { icon: 'play', tone: 'royal' }, open: { icon: 'clock', tone: 'slate' }, upcoming: { icon: 'clock', tone: 'slate' },
  paused: { icon: 'pause', tone: 'graphite' }, planning: { icon: 'edit', tone: 'graphite' },
  at_risk: { icon: 'alert', tone: 'sand' }, watch: { icon: 'alert', tone: 'sand' }, stalled: { icon: 'pause', tone: 'sand' }, blocked: { icon: 'lock', tone: 'plum' },
  overdue: { icon: 'alert', tone: 'plum' }, failed: { icon: 'alert', tone: 'plum' }, proposed: { icon: 'sparkle', tone: 'purple' }, abandoned: { icon: 'close', tone: 'graphite' }, cancelled: { icon: 'close', tone: 'graphite' },
};
export function StatusIcon({ status, size = 'sm' }: { status: string; size?: TileSize }) {
  const s = STATUS[status] ?? { icon: 'info' as IconName, tone: 'graphite' as Tone };
  return <IconTile name={s.icon} tone={s.tone} size={size} />;
}

/** Plain glyph for navigation bars (no tile); a tile when `tile` is set (More sheet). */
export function NavigationIcon({ name, tile, tone = 'graphite' }: { name: IconName; tile?: boolean; tone?: Tone }) {
  return tile ? <IconTile name={name} tone={tone} size="lg" /> : <Icon name={name} />;
}

export function MetricIcon({ name, tone = 'purple', children }: { name: IconName; tone?: Tone; children?: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><IconTile name={name} tone={tone} size="sm" />{children}</span>;
}
