import { Pipe, PipeTransform } from '@angular/core';
import { TemplateStatus } from '../../enums/template-status.enum';

/** Pipe that translates a template status into its Italian label. */
@Pipe({
  name: 'templateStatus'
})
export class TemplateStatusPipe implements PipeTransform {

  /**
   * Transforms a template status value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case TemplateStatus.Draft:
        label = 'Bozza';
        break;
      case TemplateStatus.Published:
        label = 'Attivo';
        break;
      case TemplateStatus.Withdrawn:
        label = 'Archiviato';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
