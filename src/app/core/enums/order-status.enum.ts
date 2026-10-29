/**
 * Enum describing the lifecycle of an order.
 * Transitions: DRAFT → TO_BE_PRICED → PRICED → SENT → ACCEPTED → CONFIRMED → CLOSED, or DRAFT → SENT
 * without customizations; a reseller's offer passes through TO_BE_APPROVED → APPROVED before SENT.
 * An order may be refused or cancelled before its confirmation, and evaluating a customization again
 * sends it back to PRICED.
 */
export enum OrderStatus {
  Draft = 'DRAFT',
  /** Carries customization requests waiting for the back office to price it. */
  ToBePriced = 'TO_BE_PRICED',
  /** The back office priced or refused the customizations: the seller generates the offer. */
  Priced = 'PRICED',
  /** The reseller asked the Keus back office to approve its offer. */
  ToBeApproved = 'TO_BE_APPROVED',
  /** The Keus back office approved the offer: the reseller generates it. */
  Approved = 'APPROVED',
  /** The offer has been generated and sent. */
  Sent = 'SENT',
  /** The signed offer has been uploaded. */
  Accepted = 'ACCEPTED',
  /** The back office confirmed the order and set the delivery date. */
  Confirmed = 'CONFIRMED',
  /** Every line has been provisioned. */
  Closed = 'CLOSED',
  Refused = 'REFUSED',
  Cancelled = 'CANCELLED',
}
