import { Pipe, PipeTransform } from '@angular/core';
import { TemplateType } from '../../enums/template-type.enum';

/** Pipe that translates a template type into its Italian label. */
@Pipe({
  name: 'templateType'
})
export class TemplateTypePipe implements PipeTransform {

  /**
   * Transforms a template type value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case TemplateType.Offer:
        label = 'Offerta';
        break;
      case TemplateType.Contract:
        label = 'Contratto';
        break;
      case TemplateType.ProForma:
        label = 'Pro forma';
        break;
      case TemplateType.ResellerContract:
        label = 'Contratto rivenditore';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
