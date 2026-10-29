import { FormControl } from "@angular/forms";
import { DateRange } from "../../../interfaces/date-range.interface";

/**
 * Interface representing the structure of the filter trials form.
 */
export interface FilterTrialsForm {
  /** Start of the associated email. */
  email: FormControl<string | null>;
  /** Date type to filter by (activatedAt, expiresAt). */
  dateType: FormControl<string | null>;
  /** Period on the chosen date; empty bounds mean no limit. */
  period: FormControl<DateRange | null>;
  /** Trial statuses; null means every status. */
  status: FormControl<string[] | null>;
}
