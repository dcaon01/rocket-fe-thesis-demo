/**
 * Enum describing the publication state of a sales material.
 * Transitions: DRAFT → PUBLISHED → WITHDRAWN, and a withdrawn material may be published again.
 * A material stays editable in every state; a published one cannot be deleted.
 */
export enum MaterialStatus {
  /** Material being prepared, invisible to the resellers. */
  Draft = 'DRAFT',
  /** Material on the shelf of the resellers it is assigned to. */
  Published = 'PUBLISHED',
  /** Material taken off the shelf. */
  Withdrawn = 'WITHDRAWN',
}
