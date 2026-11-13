/**
 * Enum describing where the electronic invoice of an invoice stands: first the steps of Rocket, which creates it as a
 * draft at Sibill once the invoice is paid, then the states Sibill reports after the CEO issues it.
 */
export enum InvoiceDocumentStatus {
  /** Waiting for the payment, or paid and waiting for its draft. */
  ToIssue = 'TO_ISSUE',
  /** A call to Sibill is running. */
  Issuing = 'ISSUING',
  /** Sibill refused it: it is created again once fixed. */
  Failed = 'FAILED',
  /** Sibill did not answer: it may exist, so it is checked on Sibill first. */
  Uncertain = 'UNCERTAIN',
  /** Draft at Sibill: the work of Rocket is done, the CEO issues it from Sibill. */
  Draft = 'DRAFT',
  Sent = 'SENT',
  Delivered = 'DELIVERED',
  /** The exchange system could not deliver it: it is valid anyway. */
  NotDelivered = 'NOT_DELIVERED',
  /** Discarded by the exchange system: it is fixed and sent again from Sibill. */
  Discarded = 'DISCARDED',
  /** Refused by the customer, possible only towards the public administration. */
  Refused = 'REFUSED',
}
