/** State of an operation sent to a product. */
export enum OperationState {
  /** Sent, with no answer yet. */
  Pending = "PENDING",
  Done = "DONE",
  /** The product answered with an error. */
  Failed = "FAILED",
  /** Discarded by the operator after the product's error. */
  Abandoned = "ABANDONED",
}
