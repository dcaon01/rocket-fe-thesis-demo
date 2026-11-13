import { FormControl } from '@angular/forms';

/** Interface representing the filter form of the template list. */
export interface FilterTemplatesForm {
  /** Start of the template name. */
  search: FormControl<string | null>;
  /** Template types; null means every type. */
  type: FormControl<string[] | null>;
  /** Template statuses; null means every status. */
  status: FormControl<string[] | null>;
}
