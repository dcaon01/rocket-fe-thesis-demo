/**
 * Enum describing the kind of document a template produces.
 * The offer is bound to a channel, the contract, the pro forma and the reseller contract are single.
 */
export enum TemplateType {
  Offer = 'OFFER',
  Contract = 'CONTRACT',
  ProForma = 'PRO_FORMA',
  ResellerContract = 'RESELLER_CONTRACT',
}
