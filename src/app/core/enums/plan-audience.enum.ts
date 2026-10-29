/**
 * Audience of a plan: who the plan is sold to.
 * Mirrors the backend plan audience values.
 */
export enum PlanAudience {
  /** Plan sold to the companies served. The stored value stays CLIENT. */
  Company = 'CLIENT',
  /** Plan sold to professionals (referral model). */
  Professional = 'PROFESSIONAL',
  /** Plan sold to resellers. */
  Reseller = 'RESELLER',
}
