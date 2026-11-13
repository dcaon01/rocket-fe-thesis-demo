/**
 * Why a customer is on the follow-up list of the customer success metrics, or at risk on the reseller dashboard.
 */
export enum CustomerFollowUpReason {
  /* Credentials delivered and no first access yet. */
  NeverActivated = 'NEVER_ACTIVATED',
  /* Contract cancelled and not ended yet. */
  Terminating = 'TERMINATING',
  /* Access suspended for an unpaid invoice. */
  AccessSuspended = 'ACCESS_SUSPENDED',
  /* Usage below the threshold on the risk lever of the product metrics: set by the frontend, not by the API. */
  LowUsage = 'LOW_USAGE',
}
