import { FormControl } from "@angular/forms";

/**
 * Form group interface for authentication forms.
 */
export interface ChangePasswordForm {
  /** User's new password */
  password: FormControl<string>;
  /** User's password confirmation */
  confirmPassword: FormControl<string>;
}