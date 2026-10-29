import { Pipe, PipeTransform } from '@angular/core';
import { ResellerTier } from '../../enums/reseller-tier.enum';

@Pipe({
  name: 'resellerTier'
})
export class ResellerTierPipe implements PipeTransform {

  /**
   * Transforms a reseller tier value into its corresponding label.
   * @param value the reseller tier value to transform.
   * @returns the reseller tier label.
   */
  transform(value: string | null | undefined): string {
    let label = '';
    switch(value) {
      case ResellerTier.Silver:
        label = "Silver";
        break;
      case ResellerTier.Gold:
        label = "Gold";
        break;
      case ResellerTier.Platinum:
        label = "Platinum";
        break;
      default:
        label = "-";
        break;
    }
    return label;
  }

}
