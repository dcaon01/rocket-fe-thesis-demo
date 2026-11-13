/**
 * Discriminator that controls which pricing fields are relevant
 * for a Plan.
 */
export enum PlanType {
  /** Volume-tiered pricing. */
  TieredVolume = 'TIERED_VOLUME',
  /** One-time charge. */
  OneTime = 'ONE_TIME',
  /** Flat recurring price. */
  RecurringFlat = 'RECURRING_FLAT',
}
