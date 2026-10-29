import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cognitoUserStatus'
})
export class CognitoUserStatusPipe implements PipeTransform {

  /**
   * Transforms a Cognito user status value into its corresponding label.
   * @param value the value of the status to transform. 
   * @returns the corresponding label for the given status value.
   */
  transform(value: string | null | undefined): string {
    if (!value) return '-';

    const statusMap: { [key: string]: string } = {
      'UNCONFIRMED': 'Non confermato',
      'CONFIRMED': 'Confermato',
      'ARCHIVED': 'Archiviato',
      'COMPROMISED': 'Compromesso',
      'UNKNOWN': 'Sconosciuto',
      'RESET_REQUIRED': 'Reset richiesto',
      'FORCE_CHANGE_PASSWORD': 'Cambio password',
      'EXTERNAL_PROVIDER': 'Provider esterno'
    };

    return statusMap[value.toUpperCase()] || value;
  }

}
