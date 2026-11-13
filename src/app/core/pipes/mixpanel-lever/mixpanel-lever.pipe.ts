import { Pipe, PipeTransform } from '@angular/core';
import { MixpanelLever } from '../../enums/mixpanel-lever.enum';

/**
 * Pipe that translates a lever of the product metrics into its label.
 */
@Pipe({
  name: 'mixpanelLever'
})
export class MixpanelLeverPipe implements PipeTransform {

  /**
   * Transforms a lever into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string): string {
    switch (value) {
      case MixpanelLever.Activation:
        return 'Attivazione';
      case MixpanelLever.Operational:
        return 'Operativi';
      case MixpanelLever.Value:
        return 'Valore';
      case MixpanelLever.Risk:
        return 'Rischio';
      default:
        return value;
    }
  }
}
