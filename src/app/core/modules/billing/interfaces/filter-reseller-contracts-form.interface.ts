import { FormControl } from "@angular/forms";

/**
 * Interface representing the form used to filter the reseller contracts.
 */
export interface FilterResellerContractsForm {
  /** Start of the contract code, reseller name or reseller code. */
  search: FormControl<string | null>;
  /** Partner tiers; null means every tier. */
  tier: FormControl<string[] | null>;
  /** Statuses; null means every status. */
  status: FormControl<string[] | null>;
}
