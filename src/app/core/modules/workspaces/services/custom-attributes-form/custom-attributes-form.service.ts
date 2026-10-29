import { Injectable } from '@angular/core';
import { Form, FormControl, FormGroup, Validators } from '@angular/forms';
import { CoreUserAttributeDto } from '../../../../../../../libs/api/src';

@Injectable({
  providedIn: 'root'
})
export class CustomAttributesFormService {
  /**
   * Generates form controls for custom attributes.
   * @param customAttributes list of custom attribute names.
   * @returns form group containing the custom attribute form controls.
   */
  generateCustomAttributesFormControls(customAttributes: string[]): FormGroup {
    let customAttributesFormControls = new FormGroup({});
    customAttributes.forEach((attr) => {
      customAttributesFormControls.addControl(
        attr,
        new FormControl<string | null>(null, [Validators.required])
      );
    });
    return customAttributesFormControls;
  }
}
