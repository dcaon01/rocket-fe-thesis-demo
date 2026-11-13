import { FormControl } from "@angular/forms";

/** Interface representing the filter form of the companies. */
export interface FilterCompanies {
  /** Start of the company name. */
  name: FormControl<string | null>;
  /** Start of the company email. */
  email: FormControl<string | null>;
  /** Company statuses; null means every status. */
  status: FormControl<string[] | null>;
}
