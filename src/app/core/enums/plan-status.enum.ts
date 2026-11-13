/**
 * Enum describing the lifecycle state of a Plan.
 * Plans are created in DRAFT and promoted to ACTIVE when ready.
 * Archived plans are preserved for historical reference but cannot be
 * associated to new contracts.
 */
export enum PlanStatus {
  /** Plan is being prepared and not yet usable on contracts. */
  Draft = 'DRAFT',
  /** Plan is available to be associated to new contracts. */
  Active = 'ACTIVE',
  /** Plan is retained for historical reference only. */
  Archived = 'ARCHIVED',
}
