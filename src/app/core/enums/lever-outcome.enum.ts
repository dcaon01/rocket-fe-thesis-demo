/**
 * How a tenant comes out of the key rule of a lever.
 */
export enum LeverOutcome {
  Compliant = 'COMPLIANT',
  AtRisk = 'AT_RISK',
  Failing = 'FAILING',
  /* Too young for the lever, below the minimum sample, or still within the time of a milestone. */
  NotAssessable = 'NOT_ASSESSABLE',
  /* Measured by a rule still in observation, which does not judge. */
  Observed = 'OBSERVED',
}
