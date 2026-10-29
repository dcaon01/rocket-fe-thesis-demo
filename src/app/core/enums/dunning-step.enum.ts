/**
 * Enum describing the last step of the dunning done on an unpaid invoice.
 */
export enum DunningStep {
  FirstReminder = 'FIRST_REMINDER',
  SecondReminder = 'SECOND_REMINDER',
  /** The company has been told the date its accesses will be suspended. */
  SuspensionNotice = 'SUSPENSION_NOTICE',
  Suspension = 'SUSPENSION',
}
