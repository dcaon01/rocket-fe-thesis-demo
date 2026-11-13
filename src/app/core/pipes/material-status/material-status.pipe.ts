import { Pipe, PipeTransform } from '@angular/core';
import { MaterialStatus } from '../../enums/material-status.enum';

/** Pipe that translates a material status into its Italian label. */
@Pipe({
  name: 'materialStatus'
})
export class MaterialStatusPipe implements PipeTransform {

  /**
   * Transforms a material status value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case MaterialStatus.Draft:
        label = 'Bozza';
        break;
      case MaterialStatus.Published:
        label = 'Pubblicato';
        break;
      case MaterialStatus.Withdrawn:
        label = 'Ritirato';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
