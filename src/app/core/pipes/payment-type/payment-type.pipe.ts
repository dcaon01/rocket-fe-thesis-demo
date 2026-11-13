import { Pipe, PipeTransform } from '@angular/core';
import { PaymentType } from '../../enums/payment-type.enum';

@Pipe({
  name: 'paymentType'
})
export class PaymentTypePipe implements PipeTransform {

  /**
   * Transforms a payment type value into its corresponding label.
   * @param value the payment type value to transform.
   * @returns the label corresponding to the payment type.
   */
  transform(value: string): string {
    switch (value) {
      case PaymentType.Monthly:
        return 'Mensile';
      case PaymentType.Annual:
        return 'Annuale';
      default:
        return '-';
    }
  }

}
