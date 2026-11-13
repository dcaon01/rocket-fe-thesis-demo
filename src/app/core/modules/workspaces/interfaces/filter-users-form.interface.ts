import { FormControl } from "@angular/forms";

/**
 * Interface representing the form used to filter users.
 */
export interface FilterUsersForm {
  /** Start of the name, surname or email. */
  search: FormControl<string | null>;
  /** Start of the tenant name. */
  tenantName: FormControl<string | null>;
  /** User statuses; null means every status. */
  status: FormControl<string[] | null>;
}
