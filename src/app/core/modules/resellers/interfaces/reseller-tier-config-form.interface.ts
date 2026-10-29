import { FormControl } from "@angular/forms";

/**
 * Interface representing the configuration form of a single commercial tier.
 */
export interface ResellerTierConfigForm {
  /** Fee in euros for the first year. */
  firstYearFee: FormControl<number | null>;
  /** Fee in euros for the second year. */
  secondYearFee: FormControl<number | null>;
  /** Fee in euros from the third year on. */
  ongoingFee: FormControl<number | null>;
  /** Discount percentage applied to activation amounts. */
  activationDiscountPercent: FormControl<number | null>;
  /** Discount percentage applied to recurring amounts. */
  subscriptionDiscountPercent: FormControl<number | null>;
  /** Discount percentage applied to customization amounts. */
  customizationDiscountPercent: FormControl<number | null>;
}
