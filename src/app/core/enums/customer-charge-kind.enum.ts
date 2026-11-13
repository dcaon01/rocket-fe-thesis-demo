/**
 * Enum describing what a reseller bills one of its customers: the share of a contract, or an item added by hand.
 */
export enum CustomerChargeKind {
  /** A period or a proration of a contract, written by Rocket. */
  Contract = 'CONTRACT',
  OneOff = 'ONE_OFF',
  Recurring = 'RECURRING',
}
