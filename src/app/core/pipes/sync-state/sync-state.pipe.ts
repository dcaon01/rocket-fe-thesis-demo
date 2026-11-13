import { Pipe, PipeTransform } from '@angular/core';
import { SyncState } from '../../enums/sync-state.enum';

/**
 * Pipe that translates the synchronisation state of a tenant or user into its label.
 */
@Pipe({
  name: 'syncState'
})
export class SyncStatePipe implements PipeTransform {

  /**
   * Transforms a value into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string | null | undefined): string {
    switch (value) {
      case SyncState.InSync:
        return 'Sincronizzato';
      case SyncState.Pending:
        return 'In attesa';
      case SyncState.Failed:
        return 'Errore';
      default:
        return '-';
    }
  }

}
