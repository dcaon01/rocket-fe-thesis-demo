import { Pipe, PipeTransform } from '@angular/core';
import { MixpanelInactivityScope } from '../../enums/mixpanel-inactivity-scope.enum';

/**
 * Pipe that translates what an inactivity rule looks at into its label.
 */
@Pipe({
  name: 'mixpanelInactivityScope'
})
export class MixpanelInactivityScopePipe implements PipeTransform {

  /**
   * Transforms a scope into its label.
   * @param value the value to transform.
   * @returns the label.
   */
  transform(value: string): string {
    switch (value) {
      case MixpanelInactivityScope.Tenant:
        return 'Azienda';
      case MixpanelInactivityScope.User:
        return 'Utente';
      case MixpanelInactivityScope.Object:
        return 'Oggetto';
      default:
        return value;
    }
  }
}
