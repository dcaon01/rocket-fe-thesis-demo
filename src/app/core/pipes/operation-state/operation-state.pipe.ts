import { Pipe, PipeTransform } from '@angular/core';
import { OperationState } from '../../enums/operation-state.enum';

/**
 * Pipe that translates the state of an operation sent to a product into its label.
 */
@Pipe({
  name: 'operationState'
})
export class OperationStatePipe implements PipeTransform {

  /**
   * Transforms a value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    switch (value) {
      case OperationState.Pending:
        return 'In attesa';
      case OperationState.Done:
        return 'Confermata';
      case OperationState.Failed:
        return 'Errore';
      case OperationState.Abandoned:
        return 'Scartata';
      default:
        return '-';
    }
  }

}
