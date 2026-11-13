import { Pipe, PipeTransform } from '@angular/core';
import { MixpanelRuleDirection } from '../../enums/mixpanel-rule-direction.enum';

/**
 * Pipe that translates the direction of a lever rule into its label.
 */
@Pipe({
  name: 'mixpanelRuleDirection'
})
export class MixpanelRuleDirectionPipe implements PipeTransform {

  /**
   * Transforms a direction into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string): string {
    switch (value) {
      case MixpanelRuleDirection.AtLeast:
        return 'Almeno la soglia';
      case MixpanelRuleDirection.AtMost:
        return 'Al massimo la soglia';
      default:
        return value;
    }
  }
}
