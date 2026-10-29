/**
 * Represents a metric card displayed in the dashboard.
 */
export interface CardItem {
  name: string;
  value: number;
  prefix: string;
  decimals: number;
  suffix?: string;
  icon: string;
  /** Comparison with the previous period, shown under the value. */
  note?: string;
}
