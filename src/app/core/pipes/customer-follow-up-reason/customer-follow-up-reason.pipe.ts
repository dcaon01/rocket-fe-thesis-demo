import { Pipe, PipeTransform } from '@angular/core';
import { CustomerFollowUpReason } from '../../enums/customer-follow-up-reason.enum';

/**
 * Pipe that translates why a customer is to follow up into its label.
 */
@Pipe({
  name: 'customerFollowUpReason'
})
export class CustomerFollowUpReasonPipe implements PipeTransform {

  /**
   * Transforms a follow-up reason into its corresponding label.
   * @param value the reason to transform.
   * @returns the reason label.
   */
  transform(value: string): string {
    switch (value) {
      case CustomerFollowUpReason.NeverActivated:
        return 'Mai attivata';
      case CustomerFollowUpReason.Terminating:
        return 'In cessazione';
      case CustomerFollowUpReason.AccessSuspended:
        return 'Accessi sospesi';
      case CustomerFollowUpReason.LowUsage:
        return 'Uso sotto soglia';
      default:
        return value;
    }
  }
}
