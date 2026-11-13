import { Injectable, signal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CoreStructureField } from '../../../../../../../libs/api/src';
import { TypeEnum } from '../../../../enums/type.enum';

/**
 * Service for handling dynamic forms based on structure fields.
 */
@Injectable()
export class StructureDynamicFormService {
  /**
   * Generates the form controls for the company data based on the tenant structure.
   * @param tenantStructure the tenant structure to generate the form from.
   */
  generateFormControls(structure: CoreStructureField[]): FormGroup {
    let dynamicFormControls = new FormGroup({});
    structure.forEach((field) => {
      const control = this.getFormControlByType(field);
      control.setValidators(this.getValidators(field));
      dynamicFormControls.addControl(field.name, control);
    });
    return dynamicFormControls;
  }

  /**
   * Generates a form control based on the type.
   * @param field the structure field to generate the form control for.
   * @returns the form control created.
   */
  getFormControlByType(field: CoreStructureField): FormControl {
    if (field.array) {
      switch (field.type) {
        // Only string and number arrays are supported for now.
        case TypeEnum.String:
          return new FormControl<string[] | null>(null);
        case TypeEnum.Number:
          return new FormControl<number[] | null>(null);
        default:
          return new FormControl<any[] | null>(null);
      }
    } else {
      switch (field.type) {
        case TypeEnum.String:
          return new FormControl<string | null>(null);
        case TypeEnum.Number:
          return new FormControl<number | null>(null);
        case TypeEnum.Boolean:
          return new FormControl<boolean | null>(false);
        case TypeEnum.Object:
          return new FormControl<object | null>(null);
        default:
          return new FormControl<any | null>(null);
      }
    }
  }

  /**
   * Gets validators for a specific field.
   * @param field get validators for a specific field.
   * @returns the validators for the field.
   */
  getValidators(field: CoreStructureField): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (field.required) {
      validators.push((control) => {
        const value = control.value;
        if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
          return { required: true };
        }
        return null;
      });
    }
    if (field.type === TypeEnum.Object && !field.array) {
      validators.push(this.jsonValidator());
    }

    return validators;
  }

  /**
   * Parses raw form data values according to the structure field types.
   * Converts string values to their proper types (number, boolean, object).
   * @param data the raw form data object.
   * @param structure the structure fields definition.
   * @returns the data object with properly typed values.
   */
  static parseDataByStructure(data: { [key: string]: any }, structure: CoreStructureField[]): { [key: string]: any } {
    const parsed: { [key: string]: any } = {};
    structure.forEach(field => {
      const value = data[field.name];
      if (value === null || value === undefined) {
        parsed[field.name] = value;
        return;
      }

      if (field.array && Array.isArray(value)) {
        switch (field.type) {
          case TypeEnum.Number:
            parsed[field.name] = value.map((v: any) => typeof v === 'string' ? parseFloat(v) : v);
            break;
          default:
            parsed[field.name] = value;
        }
        return;
      }

      switch (field.type) {
        case TypeEnum.Number:
          parsed[field.name] = typeof value === 'string' ? parseFloat(value) : value;
          break;
        case TypeEnum.Boolean:
          parsed[field.name] = typeof value === 'string' ? value === 'true' : !!value;
          break;
        case TypeEnum.Object:
          if (typeof value === 'string') {
            try {
              parsed[field.name] = JSON.parse(value);
            } catch {
              parsed[field.name] = value;
            }
          } else {
            parsed[field.name] = value;
          }
          break;
        default:
          parsed[field.name] = value;
      }
    });
    return parsed;
  }

  /**
   * Formats backend data for form display.
   * Converts object values to JSON strings so textareas show readable content instead of "[object Object]".
   * @param data the data object from the backend.
   * @param structure the structure fields definition.
   * @returns the data object with values formatted for form display.
   */
  static formatDataForForm(data: { [key: string]: any }, structure: CoreStructureField[]): { [key: string]: any } {
    const formatted: { [key: string]: any } = {};
    structure.forEach(field => {
      const value = data[field.name];
      if (value === null || value === undefined) {
        // A switch has no empty state: a missing boolean reads as off.
        formatted[field.name] = field.type === TypeEnum.Boolean && !field.array ? false : value;
        return;
      }

      if (field.type === TypeEnum.Object && typeof value === 'object' && !Array.isArray(value)) {
        formatted[field.name] = JSON.stringify(value, null, 2);
      } else {
        formatted[field.name] = value;
      }
    });
    return formatted;
  }

  /**
   * Validator for JSON strings.
   * Checks if the value is a valid JSON string or a valid object.
   * @returns a validator function that returns an error object if validation fails.
   */
  private jsonValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      // Se è vuoto, lascia che required gestisca
      if (value === null || value === undefined || value === '') {
        return null;
      }

      // Se è già un oggetto, va bene
      if (typeof value === 'object' && !Array.isArray(value)) {
        return null;
      }

      // Se è una stringa, prova a parsarla come JSON
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          // Verifica che il risultato sia un oggetto (non array, null, etc.)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return null;
          }
          return { invalidJson: { message: 'Il JSON deve essere un oggetto' } };
        } catch (error) {
          return { invalidJson: { message: 'JSON non valido', error: (error as Error).message } };
        }
      }

      return { invalidJson: { message: 'Il valore deve essere un oggetto JSON valido' } };
    };
  }
}
