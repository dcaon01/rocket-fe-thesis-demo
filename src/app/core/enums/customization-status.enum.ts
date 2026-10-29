/**
 * Enum describing the evaluation of a customization request by the back office.
 */
export enum CustomizationStatus {
  /** Waiting for the back office to price or refuse it. */
  Requested = 'REQUESTED',
  Quoted = 'QUOTED',
  Refused = 'REFUSED',
}
