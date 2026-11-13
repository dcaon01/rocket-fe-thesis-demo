import { FormControl } from '@angular/forms';
import { DateRange } from '../../../interfaces/date-range.interface';

/** Interface representing the filter form of the schedule and of the invoices of a reseller. */
export interface FilterResellerScheduleForm {
  /** Start of the invoice number, the customer, the contract or the description. */
  search: FormControl<string | null>;
  /** Which way the money goes; none or both mean both. */
  direction: FormControl<string[] | null>;
  /** Open or closed: on the schedule the due dates of the customers to collect, on the invoices every entry; none or both mean both. */
  state: FormControl<string[] | null>;
  /** Period of the due dates. */
  period: FormControl<DateRange | null>;
}
