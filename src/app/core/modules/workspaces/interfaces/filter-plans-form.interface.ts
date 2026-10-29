import { FormControl } from "@angular/forms";

/**
 * Interface representing the form used to filter plans.
 */
export interface FilterPlansForm {
  /** Plan statuses; null means every status. */
  status: FormControl<string[] | null>;
  /** Start of the plan name. */
  name: FormControl<string | null>;
}
