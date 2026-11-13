export enum UserStatus {
  /** Asked to the product, not created yet. */
  Requested = "REQUESTED",
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  /** Discarded by the operator after the product answered with an error. */
  Cancelled = "CANCELLED",
  /** Deleted on the product, kept until it is removed for good. */
  Deleted = "DELETED",
}
