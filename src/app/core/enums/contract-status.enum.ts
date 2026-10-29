export enum ContractStatus {
  /* The contract is in force since its order line was provisioned. */
  Active = 'ACTIVE',
  /* A cancellation is recorded: the contract ends at its termination date. */
  Terminating = 'TERMINATING',
  /* The contract has ended. */
  Terminated = 'TERMINATED',
}
