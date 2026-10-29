import { Pipe, PipeTransform } from '@angular/core';
import { DunningStep } from '../../enums/dunning-step.enum';

/** Pipe that translates the last step of the dunning of an invoice into its Italian label. */
@Pipe({
  name: 'dunningStep'
})
export class DunningStepPipe implements PipeTransform {

  /**
   * Transforms a dunning step value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    switch (value) {
      case DunningStep.FirstReminder:
        return '1° sollecito';
      case DunningStep.SecondReminder:
        return '2° sollecito';
      case DunningStep.SuspensionNotice:
        return 'Preavviso di sospensione';
      case DunningStep.Suspension:
        return 'Sospensione';
      default:
        return 'Nessun sollecito';
    }
  }
}
