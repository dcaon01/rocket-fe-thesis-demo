/**
 * Enum describing the collection of an invoice.
 */
export enum InvoiceStatus {
  /** Issued and waiting for its charge. */
  Open = 'OPEN',
  Paid = 'PAID',
  /** The charge was attempted and failed. */
  Unpaid = 'UNPAID',
  /** Cancelled after issue. */
  Void = 'VOID',
}
