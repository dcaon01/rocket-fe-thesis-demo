export enum ResellerContractStatus {
  /* The contract is in draft status and not yet active. */
  Draft = "DRAFT",
  /* The contract is signed. */
  Signed = "SIGNED",
  /* The contract is active and in effect (the payments are regular). */
  Active = "ACTIVE",
  /* The contract is temporarily suspended due to non-payment or other issues. */
  Suspended = "SUSPENDED",
  /* The contract will be terminated at the next renewal date. */
  EndedAtRenewal = "ENDED_AT_RENEWAL",
  /* The contract has been terminated. */
  Ended = "ENDED",
  /* The contract has been refused by the client. */
  Refused = "REFUSED",
}
