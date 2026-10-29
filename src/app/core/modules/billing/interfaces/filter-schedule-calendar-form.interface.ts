import { FormControl } from '@angular/forms';

/** Interface representing the filter form of the payment schedule calendar. */
export interface FilterScheduleCalendarForm {
  /** Start of the number, legal name or VAT number. */
  search: FormControl<string | null>;
  /** Collection statuses; null means every status still to collect. */
  status: FormControl<string[] | null>;
}
