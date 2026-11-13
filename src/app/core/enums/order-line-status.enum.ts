/**
 * Enum describing the provisioning state of an order line.
 * A line has no state until its order is confirmed.
 */
export enum OrderLineStatus {
  /** The order is confirmed and the line is waiting to be provisioned. */
  ToBeProvisioned = 'TO_BE_PROVISIONED',
  /** Credentials delivered. */
  Provisioned = 'PROVISIONED',
  /** First access with acceptance of the terms of use. */
  Activated = 'ACTIVATED',
}
