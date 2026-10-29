/** Where a tenant created by hand comes from. */
export enum TenantOrigin {
  /** A trial not yet redeemed. */
  Trial = 'TRIAL',
  /** An order line waiting to be provisioned: the tenant is born with its referent and the line's contract. */
  OrderLine = 'ORDER_LINE',
}
