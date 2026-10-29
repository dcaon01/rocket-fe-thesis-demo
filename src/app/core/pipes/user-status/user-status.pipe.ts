import { Pipe, PipeTransform } from '@angular/core';
import { UserStatus } from '../../enums/user-status.enum';

@Pipe({
  name: 'userStatus'
})
export class UserStatusPipe implements PipeTransform {

  /**
   * Transforms a user status value into its corresponding label.
   * @param value the status value to transform.
   * @returns the status label.
   */
  transform(value: string | null | undefined): string {
    switch (value) {
      case UserStatus.Active:
        return 'Attivo';
      case UserStatus.Requested:
        return 'Richiesto';
      case UserStatus.Inactive:
        return 'Non attivo';
      case UserStatus.Cancelled:
        return 'Annullato';
      case UserStatus.Deleted:
        return 'Eliminato';
      default:
        return '-';
    }
  }

}
