import { FormControl } from "@angular/forms";
import { CoreCreateResellerContractDto } from "../../../../../../libs/api/src";

/**
 * Interface representing the create/edit form of a reseller contract.
 */
export interface CreateEditResellerContractForm {
  /** Reseller the contract is opened with. */
  resellerId: FormControl<string | null>;
  /** Partner tier of the contract. */
  tier: FormControl<CoreCreateResellerContractDto['tier'] | null>;
  /** Products the reseller is enabled to sell under the contract. */
  productIds: FormControl<string[] | null>;
  /** Start date of the contract. */
  validityDate: FormControl<Date | null>;
  /** Margin percentage on the activation amounts. */
  activationPercent: FormControl<number | null>;
  /** Margin percentage on the recurring amounts of the products. */
  recurringPercent: FormControl<number | null>;
  /** Margin percentage on the customizations. */
  customizationPercent: FormControl<number | null>;
  /** Fee in euros for the first year. */
  firstYearFee: FormControl<number | null>;
  /** Fee in euros for the second year. */
  secondYearFee: FormControl<number | null>;
  /** Fee in euros from the third year on. */
  ongoingFee: FormControl<number | null>;
}
