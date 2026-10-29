import { Pipe, PipeTransform } from '@angular/core';
import { PlanStatus } from '../../enums/plan-status.enum';

@Pipe({
  name: 'planStatus'
})
export class PlanStatusPipe implements PipeTransform {

  /**
   * Transforms a status value into its corresponding label.
   * @param value the status value to transform.
   * @returns the status label.
   */
  transform(value: string | null | undefined): string {
    let statusString = '';
    switch(value) {
      case PlanStatus.Draft:
        statusString = "Bozza";
        break;
      case PlanStatus.Active:
        statusString = "Attivo";
        break;
      case PlanStatus.Archived:
        statusString = "Archiviato";
        break;
      default:
        statusString = "-";
        break;
    }
    return statusString;
  }

}
