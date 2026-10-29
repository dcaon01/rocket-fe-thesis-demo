/**
 * Enum describing a payment of the schedule of Keus: the collection states of a recorded invoice, and the payment
 * expected from a contract in force that no invoice records yet.
 */
export enum ScheduleStatus {
  Open = 'OPEN',
  /** The charge was attempted and failed. */
  Unpaid = 'UNPAID',
  Paid = 'PAID',
  /** Not charged yet: a next period of a contract in force. */
  Expected = 'EXPECTED',
}
