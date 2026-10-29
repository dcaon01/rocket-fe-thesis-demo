import { FormControl } from "@angular/forms";

/** Interface representing the filter form of the tenants of a company. */
export interface FilterCompanyTenantsForm {
  /** Start of the tenant name. */
  search: FormControl<string | null>;
  /** Product of the tenants; none means every product. */
  productId: FormControl<string | null>;
  /** Tenant statuses; null means every status. */
  status: FormControl<string[] | null>;
}
