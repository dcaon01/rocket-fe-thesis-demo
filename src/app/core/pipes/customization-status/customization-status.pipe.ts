import { Pipe, PipeTransform } from '@angular/core';
import { CustomizationStatus } from '../../enums/customization-status.enum';

/** Pipe that translates a customization status into its Italian label. */
@Pipe({
  name: 'customizationStatus'
})
export class CustomizationStatusPipe implements PipeTransform {

  /**
   * Transforms a customization status value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case CustomizationStatus.Requested:
        label = 'Da quotare';
        break;
      case CustomizationStatus.Quoted:
        label = 'Quotata';
        break;
      case CustomizationStatus.Refused:
        label = 'Non accolta';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
