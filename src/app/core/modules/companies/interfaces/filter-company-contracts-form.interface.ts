import { FormControl } from "@angular/forms";

/** Interface representing the filter form of the contracts of a company. */
export interface FilterCompanyContractsForm {
  /** Start of the contract code. */
  search: FormControl<string | null>;
  /** Product of the contracts; none means every product. */
  productId: FormControl<string | null>;
  /** Contract statuses; null means every status. */
  status: FormControl<string[] | null>;
}
