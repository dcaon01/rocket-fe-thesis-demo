import { Pipe, PipeTransform } from '@angular/core';
import { ResellerOpportunityReason } from '../../enums/reseller-opportunity-reason.enum';

/**
 * Pipe that translates why a customer of a reseller is an opportunity into its label.
 */
@Pipe({
  name: 'resellerOpportunityReason'
})
export class ResellerOpportunityReasonPipe implements PipeTransform {

  /**
   * Transforms an opportunity reason into its corresponding label.
   * @param value the reason to transform.
   * @returns the reason label.
   */
  transform(value: string): string {
    switch (value) {
      case ResellerOpportunityReason.SeatsNearCap:
        return 'Postazioni quasi esaurite';
      case ResellerOpportunityReason.SingleProduct:
        return 'Un solo prodotto';
      default:
        return value;
    }
  }
}
