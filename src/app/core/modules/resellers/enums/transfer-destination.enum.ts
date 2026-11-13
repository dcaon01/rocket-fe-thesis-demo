/** Where the companies of an inactive reseller are transferred to. */
export enum TransferDestination {
  /** Keus, which serves them directly with a new contract on the same tenant. */
  Keus = 'KEUS',
  /** Another active reseller, which takes over the contracts as they are. */
  Reseller = 'RESELLER',
}
