import { FormControl } from "@angular/forms";

/** Interface representing the filter form of the resellers. */
export interface FilterResellers {
  /** Start of the reseller company name. */
  companyName: FormControl<string | null>;
  /** Start of the reseller email. */
  email: FormControl<string | null>;
  /** Reseller statuses; null means every status. */
  status: FormControl<string[] | null>;
}
