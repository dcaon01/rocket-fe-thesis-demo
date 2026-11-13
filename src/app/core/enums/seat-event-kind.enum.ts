/**
 * Enum describing a change of the users of a contract's tenant.
 */
export enum SeatEventKind {
  /** The users went past the seats, which grew. */
  SeatsAdded = 'SEATS_ADDED',
  /** A user was deleted; the seats stay. */
  UserRemoved = 'USER_REMOVED',
}
