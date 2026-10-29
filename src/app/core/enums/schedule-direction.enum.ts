/**
 * Enum describing which way the money of a due date of a reseller goes.
 */
export enum ScheduleDirection {
  /** An invoice of Keus the reseller pays. */
  ToKeus = 'TO_KEUS',
  /** A due date the reseller collects from one of its customers. */
  FromCustomer = 'FROM_CUSTOMER',
}
