import { FormControl } from "@angular/forms";

/**
 * Interface representing the filter form for tenants in the workspaces module.
 */
export interface FilterTenantsForm {
  /** Start of the tenant name, contract code or trial email. */
  search: FormControl<string | null>;
  /** Tenant statuses; null means every status. */
  status: FormControl<string[] | null>;
}
