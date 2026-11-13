/**
 * Centralized status color definitions for badge directives.
 * Change these values to update colors globally across all status badges.
 */
export const STATUS_COLORS = {
  /** Positive states: active, paid, confirmed, enabled */
  positive: 'rk-status bg-status-success-tint text-status-success [--status-dot:var(--status-success-dot)]',

  /** Warning states: pending, draft, retrying */
  warning: 'rk-status bg-status-warning-tint text-status-warning [--status-dot:var(--status-warning-dot)]',

  /** Informative states: sent, in progress */
  info: 'rk-status bg-status-info-tint text-status-info [--status-dot:var(--status-info-dot)]',

  /** Negative states: failed, suspended, compromised */
  negative: 'rk-status bg-destructive-tint text-destructive [--status-dot:var(--status-destructive-dot)]',

  /** Neutral states: inactive, ended, voided, archived */
  neutral: 'rk-status bg-status-neutral-tint text-status-neutral [--status-dot:var(--status-neutral-dot)]',
} as const;

export type StatusColorType = keyof typeof STATUS_COLORS;
