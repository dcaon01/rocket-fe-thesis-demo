import { FormControl } from '@angular/forms';
import { SalesChannel } from '../../../enums/sales-channel.enum';
import { TemplateType } from '../../../enums/template-type.enum';

/** Interface representing the form that creates a template draft. */
export interface CreateTemplateForm {
  /** Kind of document the template produces. */
  type: FormControl<TemplateType | null>;
  /** Channel, for the offer templates. */
  channel: FormControl<SalesChannel | null>;
  /** Name of the template. */
  name: FormControl<string | null>;
}
