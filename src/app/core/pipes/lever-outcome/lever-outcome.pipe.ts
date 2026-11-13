import { Pipe, PipeTransform } from '@angular/core';
import { LeverOutcome } from '../../enums/lever-outcome.enum';

/**
 * Pipe that translates how a tenant came out of a lever into its label.
 */
@Pipe({
  name: 'leverOutcome'
})
export class LeverOutcomePipe implements PipeTransform {

  /**
   * Transforms an outcome into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string): string {
    switch (value) {
      case LeverOutcome.Compliant:
        return 'Conforme';
      case LeverOutcome.AtRisk:
        return 'In attenzione';
      case LeverOutcome.Failing:
        return 'Non conforme';
      case LeverOutcome.NotAssessable:
        return 'Non valutabile';
      case LeverOutcome.Observed:
        return 'In osservazione';
      default:
        return value;
    }
  }
}
