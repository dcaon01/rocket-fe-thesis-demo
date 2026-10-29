import { FormControl } from '@angular/forms';
import { ChargeCadence } from '../../../enums/charge-cadence.enum';
import { CustomerChargeKind } from '../../../enums/customer-charge-kind.enum';

/** Interface representing the form of an item a reseller bills one of its customers. */
export interface CreateEditCustomerChargeForm {
  /** Company billed, a customer of the reseller. */
  companyId: FormControl<string | null>;
  /** What the item bills. */
  description: FormControl<string | null>;
  /** Amount of each due date, in euro, net of VAT. */
  amount: FormControl<number | null>;
  /** Once or recurring. */
  kind: FormControl<CustomerChargeKind | null>;
  /** Due date of a one-off item. */
  dueDate: FormControl<Date | null>;
  /** First due date of a recurring item. */
  ruleStart: FormControl<Date | null>;
  /** Cadence of a recurring item. */
  cadence: FormControl<ChargeCadence | null>;
  /** Last day of a recurring item, empty while it goes on. */
  ruleEnd: FormControl<Date | null>;
}
