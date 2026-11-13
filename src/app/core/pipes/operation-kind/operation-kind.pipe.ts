import { Pipe, PipeTransform } from '@angular/core';
import { OperationKind } from '../../enums/operation-kind.enum';

/**
 * Pipe that translates what an operation asks the product into its label.
 */
@Pipe({
  name: 'operationKind'
})
export class OperationKindPipe implements PipeTransform {

  /**
   * Transforms a value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    switch (value) {
      case OperationKind.CreateTenant:
        return 'Creazione';
      case OperationKind.UpdateTenant:
        return 'Modifica';
      case OperationKind.DeleteTenant:
        return 'Eliminazione';
      case OperationKind.CreateUser:
        return 'Creazione';
      case OperationKind.UpdateUser:
        return 'Modifica';
      case OperationKind.DeleteUser:
        return 'Eliminazione';
      default:
        return '-';
    }
  }

}
