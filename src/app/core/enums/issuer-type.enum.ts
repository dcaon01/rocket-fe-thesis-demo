/**
 * Issuer of a contract: who sells and invoices the contract.
 * Mirrors the backend issuer type values.
 */
export enum IssuerType {
  /** Contract issued by Keus (platform-managed payments). */
  Keus = 'KEUS',
  /** Contract issued by a reseller (externally-managed payments). */
  Reseller = 'RESELLER',
  /** Contract issued by a professional (referral model). */
  Professional = 'PROFESSIONAL',
}
