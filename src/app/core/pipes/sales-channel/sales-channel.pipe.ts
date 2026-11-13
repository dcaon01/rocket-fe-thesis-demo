import { Pipe, PipeTransform } from '@angular/core';
import { SalesChannel } from '../../enums/sales-channel.enum';

/** Pipe that translates a sales channel into its Italian label. */
@Pipe({
  name: 'salesChannel'
})
export class SalesChannelPipe implements PipeTransform {

  /**
   * Transforms a sales channel value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    let label: string;
    switch (value) {
      case SalesChannel.Direct:
        label = 'Canale diretto';
        break;
      case SalesChannel.Reseller:
        label = 'Canale indiretto';
        break;
      default:
        label = '-';
        break;
    }
    return label;
  }
}
