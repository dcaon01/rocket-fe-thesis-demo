import { FormControl } from '@angular/forms';
import { DateRange } from '../../../interfaces/date-range.interface';

/** Interface representing the filter form of the invoice lists. */
export interface FilterInvoicesForm {
  /** Start of the number, legal name or VAT number. */
  search: FormControl<string | null>;
  /** Collection statuses; null means every status. */
  status: FormControl<string[] | null>;
  /** States of the electronic invoice; null means every state. */
  document: FormControl<string[] | null>;
  /** Period of issue, or of the due date on the schedule; an empty bound falls back to the current month. */
  period: FormControl<DateRange | null>;
}
