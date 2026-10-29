import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** The rules of a new password, the same the Cognito pool asks for; each is true once met. */
export interface PasswordRequirements {
  /** At least 8 characters. */
  hasMinLength: boolean;
  /** An upper-case letter. */
  hasUpperCase: boolean;
  /** A digit. */
  hasNumber: boolean;
  /** A special character. */
  hasSpecialChar: boolean;
}

/** Characters that count as special. */
const SPECIAL_CHAR = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

/**
 * Tells which rules a password meets.
 * @param value the password, empty while not typed.
 * @returns the rules, all false for an empty password.
 */
export function passwordRequirementsOf(value: string | null | undefined): PasswordRequirements {
  const password = value ?? '';
  return {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: SPECIAL_CHAR.test(password),
  };
}

/**
 * Validator of a new password: an empty value is left to `required`.
 * @returns the validator, with the rules under `passwordStrength` while one is not met.
 */
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) return null;

    const requirements = passwordRequirementsOf(value);
    return Object.values(requirements).every(Boolean) ? null : { passwordStrength: requirements };
  };
}
