import { Pipe, PipeTransform } from '@angular/core';
import { TrialStatus } from '../../enums/trial-status.enum';

@Pipe({
  name: 'trialStatus'
})
export class TrialStatusPipe implements PipeTransform {

  /**
   * Transforms a trial status value into its corresponding label.
   * @param value the status value to transform.
   * @returns the status label.
   */
  transform(value: string): string {
    let statusString = '';
    switch(value) {
      case TrialStatus.Active:
        statusString = "Attivo";
        break;
      case TrialStatus.Draft:
        statusString = "Bozza";
        break;
      case TrialStatus.Expired:
        statusString = "Scaduto";
        break;
      case TrialStatus.Cancelled:
        statusString = "Annullato";
        break;
      case TrialStatus.Converted:
        statusString = "Convertito";
        break;
      default:
        statusString = "-";
        break;
    }
    return statusString;
  }

}
