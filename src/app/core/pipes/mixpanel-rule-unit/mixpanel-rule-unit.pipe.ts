import { Pipe, PipeTransform } from '@angular/core';
import { MixpanelRuleUnit } from '../../enums/mixpanel-rule-unit.enum';

/**
 * Pipe that translates the time unit of a lever rule into its label.
 */
@Pipe({
  name: 'mixpanelRuleUnit'
})
export class MixpanelRuleUnitPipe implements PipeTransform {

  /**
   * Transforms a unit into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string): string {
    switch (value) {
      case MixpanelRuleUnit.Days:
        return 'Giorni';
      case MixpanelRuleUnit.WorkingDays:
        return 'Giorni lavorativi';
      case MixpanelRuleUnit.Weeks:
        return 'Settimane';
      default:
        return value;
    }
  }
}
