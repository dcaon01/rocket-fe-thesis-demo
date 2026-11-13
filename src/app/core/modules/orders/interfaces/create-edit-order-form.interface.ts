import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { CoreCustomizationAttachment } from '../../../../../../libs/api/src';
import { CustomizationKind } from '../../../enums/customization-kind.enum';
import { CustomizationStatus } from '../../../enums/customization-status.enum';

/** Interface representing a line of the order form. */
export interface OrderLineForm {
  /** Product sold on the line. */
  productId: FormControl<string | null>;
  /** Plan pricing the line; may be left empty in a draft. */
  planId: FormControl<string | null>;
  /** Seats sold on the line, for the plans priced by seats. */
  seats: FormControl<number | null>;
  /** Discount on the activation granted to the customer, in percent. */
  activationDiscountPercent: FormControl<number | null>;
  /** Discount on the recurring fee granted to the customer, in percent. */
  recurringDiscountPercent: FormControl<number | null>;
}

/** File of a customization: uploaded when it has its key, otherwise chosen and uploaded on save. */
export interface CustomizationFileValue {
  /** Name of the file. */
  name: string;
  /** Kind of the file. */
  type: CoreCustomizationAttachment['type'];
  /** S3 key, once uploaded. */
  s3Key?: string;
  /** File chosen and not uploaded yet. */
  file?: File;
}

/** Outcome the back office gives a customization: priced with its amounts, or refused with a reason. */
export interface CustomizationEvaluationForm {
  /** Priced or refused; null until the back office decides. */
  outcome: FormControl<CustomizationStatus.Quoted | CustomizationStatus.Refused | null>;
  /** One-off list amount, in euros. */
  oneOffAmount: FormControl<number | null>;
  /** Increase of the recurring fee, in euros. */
  recurringIncreaseAmount: FormControl<number | null>;
  /** Reason of the refusal, for whoever sells the order. */
  refusalReason: FormControl<string | null>;
}

/** Interface representing a customization request of the order form. */
export interface OrderCustomizationForm {
  /** Identifier of a customization already on the order; null for a new one. */
  id: FormControl<string | null>;
  /** What the customization is attached to: a line of the order. */
  kind: FormControl<CustomizationKind>;
  /** Product of the line it customizes; null until one is picked. */
  productId: FormControl<string | null>;
  /** The need, described in words. */
  description: FormControl<string | null>;
  /** Files describing the need: PDFs and voice notes. */
  attachments: FormControl<CustomizationFileValue[]>;
  /** Outcome given by the back office, editable only while it prices the order. */
  evaluation: FormGroup<CustomizationEvaluationForm>;
}

/** Interface representing the form that creates or edits an order request. */
export interface CreateEditOrderForm {
  /** Code of the order; generated when left empty. */
  code: FormControl<string | null>;
  /** Company the order is placed for; fixed after creation. */
  companyId: FormControl<string | null>;
  /** Lines of the order, one per product. */
  lines: FormArray<FormGroup<OrderLineForm>>;
  /** Customization requests: at most one per line. */
  customizations: FormArray<FormGroup<OrderCustomizationForm>>;
}
