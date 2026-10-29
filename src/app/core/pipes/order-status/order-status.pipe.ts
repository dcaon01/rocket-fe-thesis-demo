import { Pipe, PipeTransform } from '@angular/core';
import { OrderStatus } from '../../enums/order-status.enum';

/** Pipe that translates an order status into its Italian label. */
@Pipe({
  name: 'orderStatus'
})
export class OrderStatusPipe implements PipeTransform {

  /**
   * Transforms an order status value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case OrderStatus.Draft:
        label = 'Bozza';
        break;
      case OrderStatus.ToBePriced:
        label = 'Da quotare';
        break;
      case OrderStatus.Priced:
        label = 'Quotato';
        break;
      case OrderStatus.ToBeApproved:
        label = 'Da approvare';
        break;
      case OrderStatus.Approved:
        label = 'Approvato';
        break;
      case OrderStatus.Sent:
        label = 'Inviato';
        break;
      case OrderStatus.Accepted:
        label = 'Accettato';
        break;
      case OrderStatus.Confirmed:
        label = 'Confermato';
        break;
      case OrderStatus.Closed:
        label = 'Chiuso';
        break;
      case OrderStatus.Refused:
        label = 'Rifiutato';
        break;
      case OrderStatus.Cancelled:
        label = 'Annullato';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
