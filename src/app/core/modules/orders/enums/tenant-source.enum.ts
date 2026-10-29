/** Where the tenant of an order line comes from at provisioning. */
export enum TenantSource {
  /** A tenant the product creates for the line. */
  New = 'NEW',
  /** A tenant the product already has, such as the one of a trial or of a terminated contract. */
  Existing = 'EXISTING',
}
