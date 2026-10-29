import { FormControl } from "@angular/forms";
import { DateRange } from "../../../interfaces/date-range.interface";

/**
 * Interface representing the filter form of the product metrics.
 */
export interface FilterProductMetricsForm {
  /** Start of the tenant name. */
  search: FormControl<string | null>;
  /** Evaluation period; an empty bound falls back to the last 30 days. */
  period: FormControl<DateRange | null>;
}
