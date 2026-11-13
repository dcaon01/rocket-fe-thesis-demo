import { FormControl } from '@angular/forms';
import { DateRange } from '../../../interfaces/date-range.interface';

/** Interface representing the filter form of the orders queue. */
export interface FilterOrdersForm {
  /** Start of the order code, legal name or VAT number. */
  search: FormControl<string | null>;
  /** Order statuses; null means every status. */
  status: FormControl<string[] | null>;
  /** Line statuses: orders with at least one line in one of them; null means every order. */
  lineStatus: FormControl<string[] | null>;
  /** Sales channels; null means every channel. */
  channel: FormControl<string[] | null>;
  /** Request period; empty bounds mean no limit. */
  period: FormControl<DateRange | null>;
}
