/** Period of a date filter: from a day, up to a day, or both; empty bounds mean no limit. */
export interface DateRange {
  /** First day of the period, null when the period has no start. */
  from: Date | null;
  /** Last day of the period, null when the period has no end. */
  to: Date | null;
}
