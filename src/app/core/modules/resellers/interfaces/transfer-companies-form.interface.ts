import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { TransferDestination } from '../enums/transfer-destination.enum';

/** Interface representing the direct contract that takes over a contract in force, on the way to Keus. */
export interface TransferLineForm {
  /** Company of the contract. */
  companyId: FormControl<string>;
  /** Product of the contract. */
  productId: FormControl<string>;
  /** Plan for companies pricing the direct contract. */
  planId: FormControl<string | null>;
  /** Discount on the recurring fee of the plan, in percent. */
  recurringDiscountPercent: FormControl<number | null>;
}

/** Interface representing the form that transfers the companies of an inactive reseller. */
export interface TransferCompaniesForm {
  /** Where the companies go. */
  destination: FormControl<TransferDestination>;
  /** Reseller the companies go to, when the destination is a reseller. */
  resellerId: FormControl<string | null>;
  /** Companies to transfer. */
  companyIds: FormControl<string[]>;
  /** Plan of the direct contract taking over each contract in force, on the way to Keus. */
  lines: FormArray<FormGroup<TransferLineForm>>;
}
