import { FormControl } from '@angular/forms';

/** Interface representing the filter form of the material lists, global and of the reseller workspace. */
export interface FilterMaterialsForm {
  /** Start of the material title. */
  search: FormControl<string | null>;
  /** Material types; null means every type. */
  type: FormControl<string[] | null>;
  /** Material statuses, none meaning every status; global list only. */
  status: FormControl<string[] | null>;
  /** Product the material is assigned to, or null for any. */
  productId: FormControl<string | null>;
  /** Reseller tiers the material is assigned to; null means every tier; global list only. */
  tier: FormControl<string[] | null>;
}
