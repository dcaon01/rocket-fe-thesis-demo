/**
 * Account type enum representing the mutually exclusive kind of user account.
 * Collaborator is an internal Keus user, Reseller is an external reseller collaborator.
 * They correspond to the cognito user groups.
 */
export enum AccountType {
  Collaborator = "collaborator",
  Reseller = "reseller",
}
