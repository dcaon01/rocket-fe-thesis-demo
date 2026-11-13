import { Pipe, PipeTransform } from '@angular/core';
import { TenantStatus } from '../../enums/tenant-status.enum';

@Pipe({
  name: 'tenantStatus'
})
export class TenantStatusPipe implements PipeTransform {

  /**
   * Trasnforms a status value into its corresponding label.
   * @param value the status value to transform.
   * @returns the status label.
   */
  transform(value: string | null | undefined): string {
    switch (value) {
      case TenantStatus.Active:
        return 'Attivo';
      case TenantStatus.Requested:
        return 'Richiesto';
      case TenantStatus.Inactive:
        return 'Non attivo';
      case TenantStatus.Cancelled:
        return 'Annullato';
      case TenantStatus.Deleted:
        return 'Eliminato';
      default:
        return '-';
    }
  }

}
