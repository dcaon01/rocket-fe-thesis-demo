/**
 * Shape of a lever rule, that is what is measured on a tenant.
 */
export enum MixpanelRuleShape {
  /* Time from the start to the first event. */
  Milestone = 'MILESTONE',
  /* Occurrences of the event in the window. */
  Cadence = 'CADENCE',
  /* Share of the distinct values of a property that also appear on the event. */
  Coverage = 'COVERAGE',
  PropertyAverage = 'PROPERTY_AVERAGE',
  /* Time since the last event. */
  Inactivity = 'INACTIVITY',
}
