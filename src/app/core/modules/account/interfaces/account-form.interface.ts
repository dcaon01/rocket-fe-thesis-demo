import { FormControl } from '@angular/forms';

/**
 * Interface for the personal data form.
 */
export interface PersonalDataForm {
  /** User's first name. */
  name: FormControl<string>;
  /** User's last name. */
  surname: FormControl<string>;
}

/**
 * Interface for the change password form.
 */
export interface ChangePasswordForm {
  /** Current password. */
  currentPassword: FormControl<string>;
  /** New password. */
  newPassword: FormControl<string>;
  /** Confirm new password. */
  confirmPassword: FormControl<string>;
}
