import { Pipe, PipeTransform } from '@angular/core';
import { ChargeCadence } from '../../enums/charge-cadence.enum';

/**
 * Pipe that turns the cadence of a recurring item into its Italian label.
 * Usage: {{ charge.cadence | chargeCadence }}
 */
@Pipe({
  name: 'chargeCadence'
})
export class ChargeCadencePipe implements PipeTransform {
  /**
   * Transforms a cadence into its label.
   * @param cadence the cadence.
   * @returns the label.
   */
  transform(cadence: string | null | undefined): string {
    switch (cadence) {
      case ChargeCadence.Monthly:
        return 'Mensile';
      case ChargeCadence.Quarterly:
        return 'Trimestrale';
      case ChargeCadence.Annual:
        return 'Annuale';
      default:
        return '-';
    }
  }
}
