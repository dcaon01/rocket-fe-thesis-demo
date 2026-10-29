import { Pipe, PipeTransform } from '@angular/core';
import { OrderRefusalReason } from '../../enums/order-refusal-reason.enum';

/** Pipe that translates the reason of a refused offer into its Italian label. */
@Pipe({
  name: 'orderRefusalReason'
})
export class OrderRefusalReasonPipe implements PipeTransform {

  /**
   * Transforms a refusal reason value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case OrderRefusalReason.Price:
        label = 'Prezzo non in linea';
        break;
      case OrderRefusalReason.Timing:
        label = 'Tempi non compatibili';
        break;
      case OrderRefusalReason.Competitor:
        label = 'Scelto un altro fornitore';
        break;
      case OrderRefusalReason.Postponed:
        label = 'Progetto rinviato';
        break;
      case OrderRefusalReason.NeedGone:
        label = 'Necessità venuta meno';
        break;
      case OrderRefusalReason.NoAnswer:
        label = 'Nessun riscontro dal cliente';
        break;
      case OrderRefusalReason.Other:
        label = 'Altro';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
