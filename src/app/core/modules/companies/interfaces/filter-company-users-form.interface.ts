import { FormControl } from "@angular/forms";

/** Interface representing the filter form of the users of a company. */
export interface FilterCompanyUsersForm {
  /** Start of the name, surname or email of the user. */
  search: FormControl<string | null>;
  /** Product of the users; none means every product. */
  productId: FormControl<string | null>;
  /** User statuses; null means every status. */
  status: FormControl<string[] | null>;
}
