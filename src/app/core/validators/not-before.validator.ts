import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator that ensures a date is not before the date of another control, such as the end of a rule and its start.
 * Passes when either date is missing.
 * @param start the control holding the earliest date allowed.
 * @returns a ValidatorFn that produces a `notBefore` error when the date comes before the start.
 */
export function notBeforeValidator(start: AbstractControl<Date | null>): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as Date | null;
    const min = start.value;

    if (!value || !min) return null;

    return value.getTime() < min.getTime() ? { notBefore: true } : null;
  };
}
