import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator that ensures a domain field contains only a domain name and not a full URL.
 * Rejects values containing '//' or ':' (e.g. "https://example.com" or "example.com:8080").
 * @returns a ValidatorFn that produces a `domainFormat` error when the value is not a plain domain.
 */
export function domainNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) return null;

    if (value.includes('//') || value.includes(':')) {
      return { domainFormat: true };
    }

    return null;
  };
}
