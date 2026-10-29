import { Pipe, PipeTransform } from '@angular/core';
import { MaterialType } from '../../enums/material-type.enum';

/** Pipe that translates a material type into its Italian label. */
@Pipe({
  name: 'materialType'
})
export class MaterialTypePipe implements PipeTransform {

  /**
   * Transforms a material type value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case MaterialType.Catalog:
        label = 'Catalogo';
        break;
      case MaterialType.PriceList:
        label = 'Listino';
        break;
      case MaterialType.Presentation:
        label = 'Presentazione';
        break;
      case MaterialType.Connector:
        label = 'Connettore';
        break;
      case MaterialType.ExternalLink:
        label = 'Link esterno';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
