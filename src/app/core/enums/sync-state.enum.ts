/** Whether a tenant or user of Rocket matches its copy on the product. */
export enum SyncState {
  InSync = "IN_SYNC",
  /** An operation was sent and the product has not answered yet. */
  Pending = "PENDING",
  /** The product answered the open operation with an error. */
  Failed = "FAILED",
}
