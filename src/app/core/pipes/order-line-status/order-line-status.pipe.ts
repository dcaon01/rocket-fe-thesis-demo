import { Pipe, PipeTransform } from '@angular/core';
import { OrderLineStatus } from '../../enums/order-line-status.enum';

/** Pipe that translates an order line status into its Italian label. */
@Pipe({
  name: 'orderLineStatus'
})
export class OrderLineStatusPipe implements PipeTransform {

  /**
   * Transforms an order line status value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case OrderLineStatus.ToBeProvisioned:
        label = 'Da erogare';
        break;
      case OrderLineStatus.Provisioned:
        label = 'Erogata';
        break;
      case OrderLineStatus.Activated:
        label = 'Attivata';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
