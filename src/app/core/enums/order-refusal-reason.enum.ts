/**
 * Enum describing why a customer refused an offer, from the closed list of the analysis (UR-RK-014).
 */
export enum OrderRefusalReason {
  Price = 'PRICE',
  Timing = 'TIMING',
  Competitor = 'COMPETITOR',
  Postponed = 'POSTPONED',
  NeedGone = 'NEED_GONE',
  NoAnswer = 'NO_ANSWER',
  /** None of the others: the note becomes mandatory. */
  Other = 'OTHER',
}
