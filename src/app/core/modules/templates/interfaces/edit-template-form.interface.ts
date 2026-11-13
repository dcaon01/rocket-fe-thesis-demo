import { FormControl } from '@angular/forms';

/** Interface representing the form that edits a template draft. */
export interface EditTemplateForm {
  /** Name of the template. */
  name: FormControl<string | null>;
  /** HTML body, for the HTML templates. */
  body: FormControl<string | null>;
}
