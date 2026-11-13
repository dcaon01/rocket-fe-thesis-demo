import { Pipe, PipeTransform } from '@angular/core';
import { ProductStatus } from '../../enums/product-status.enum';

@Pipe({
  name: 'productStatus'
})
export class ProductStatusPipe implements PipeTransform {

  /**
   * Transforms a status value into its corresponding label.
   * @param value the status value to transform.
   * @returns the status label.
   */
  transform(value: string): string {
    let statusString = '';
    switch (value) {
      case ProductStatus.Active:
        statusString = 'Attivo';
        break;
      case ProductStatus.Inactive:
        statusString = 'Non attivo';
        break;
      default:
        statusString = '-';
        break;
    }
    return statusString;
  }

}
