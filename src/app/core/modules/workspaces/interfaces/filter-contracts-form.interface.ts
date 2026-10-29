import { FormControl } from "@angular/forms";
import { DateRange } from "../../../interfaces/date-range.interface";

/**
 * Interface representing the form used to filter contracts.
 */
export interface FilterContractsForm {
  /** Start of the code or company name. */
  search: FormControl<string | null>
  /** Contract statuses; null means every status. */
  status: FormControl<string[] | null>
  /** Date type to filter by (startDate, renewalDate, terminationDate). */
  dateType: FormControl<string | null>
  /** Period on the chosen date; empty bounds mean no limit. */
  period: FormControl<DateRange | null>;
}
