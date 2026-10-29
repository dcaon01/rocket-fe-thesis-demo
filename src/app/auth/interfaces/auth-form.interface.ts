import { FormControl } from "@angular/forms";

/**
 * Form group interface for authentication forms.
 */
export interface AuthForm {
  /** User's email address */
  email: FormControl<string>;
  /** User's password */
  password: FormControl<string>;
}