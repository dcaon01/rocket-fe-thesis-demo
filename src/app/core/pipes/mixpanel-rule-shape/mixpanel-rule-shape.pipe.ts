import { Pipe, PipeTransform } from '@angular/core';
import { MixpanelRuleShape } from '../../enums/mixpanel-rule-shape.enum';

/**
 * Pipe that translates the shape of a lever rule into its label.
 */
@Pipe({
  name: 'mixpanelRuleShape'
})
export class MixpanelRuleShapePipe implements PipeTransform {

  /**
   * Transforms a shape into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string): string {
    switch (value) {
      case MixpanelRuleShape.Milestone:
        return 'Traguardo';
      case MixpanelRuleShape.Cadence:
        return 'Cadenza';
      case MixpanelRuleShape.Coverage:
        return 'Copertura';
      case MixpanelRuleShape.PropertyAverage:
        return 'Media di una proprietà';
      case MixpanelRuleShape.Inactivity:
        return 'Inattività';
      default:
        return value;
    }
  }
}
