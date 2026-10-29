import { Pipe, PipeTransform } from '@angular/core';
import { PlanAudience } from '../../enums/plan-audience.enum';

@Pipe({
  name: 'planAudience'
})
export class PlanAudiencePipe implements PipeTransform {

  /**
   * Transforms a plan audience value into its corresponding label.
   * @param value the plan audience value to transform.
   * @returns the plan audience label.
   */
  transform(value: string | null | undefined): string {
    let label = '';
    switch(value) {
      case PlanAudience.Company:
        label = "Azienda";
        break;
      case PlanAudience.Professional:
        label = "Professionista";
        break;
      case PlanAudience.Reseller:
        label = "Rivenditore";
        break;
      default:
        label = "-";
        break;
    }
    return label;
  }

}
