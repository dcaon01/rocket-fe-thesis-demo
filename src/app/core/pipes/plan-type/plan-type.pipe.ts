import { Pipe, PipeTransform } from '@angular/core';
import { PlanType } from '../../enums/plan-type.enum';

@Pipe({
  name: 'planType'
})
export class PlanTypePipe implements PipeTransform {

  /**
   * Transforms a plan type value into its corresponding label.
   * @param value the plan type value to transform.
   * @returns the plan type label.
   */
  transform(value: string | null | undefined): string {
    let label = '';
    switch(value) {
      case PlanType.TieredVolume:
        label = "Volume a scaglioni";
        break;
      case PlanType.OneTime:
        label = "Una tantum";
        break;
      case PlanType.RecurringFlat:
        label = "Ricorrente fisso";
        break;
      default:
        label = "-";
        break;
    }
    return label;
  }

}
