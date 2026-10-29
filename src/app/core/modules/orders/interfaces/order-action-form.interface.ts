import { FormControl } from '@angular/forms';
import { Financier } from '../../../enums/financier.enum';
import { OrderRefusalReason } from '../../../enums/order-refusal-reason.enum';

/** Interface representing the fields of the order action dialog; each action uses its own. */
export interface OrderActionForm {
  /** Discount on the customization granted to the customer, in percent. */
  discountPercent: FormControl<number | null>;
  /** Reason the Keus back office refuses the approval of the reseller offer. */
  approvalRefusalReason: FormControl<string | null>;
  /** Reason the customer refused the offer. */
  refusalReason: FormControl<OrderRefusalReason | null>;
  /** Note on the refusal; mandatory with the reason «Altro». */
  refusalNote: FormControl<string | null>;
  /** Finance company of the order, or none. */
  financier: FormControl<Financier | null>;
  /** Reference of the financing file at the finance company. */
  financierReference: FormControl<string | null>;
  /** Years of fee the finance company pays upfront, the duration of the order. */
  financedYears: FormControl<number | null>;
  /** Expected delivery date, set at confirmation. */
  deliveryDate: FormControl<Date | null>;
}
