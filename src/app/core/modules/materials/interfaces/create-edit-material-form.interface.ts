import { FormControl } from '@angular/forms';
import { MaterialType } from '../../../enums/material-type.enum';
import { ResellerTier } from '../../../enums/reseller-tier.enum';

/** Interface representing the form that creates or edits a sales material. */
export interface CreateEditMaterialForm {
  /** Title shown on the shelf. */
  title: FormControl<string | null>;
  /** Short description shown on the shelf. */
  description: FormControl<string | null>;
  /** Kind of material; fixed after creation. */
  type: FormControl<MaterialType | null>;
  /** Link, for the external-link materials. */
  externalUrl: FormControl<string | null>;
  /** Products the material is about; empty means every product. */
  productIds: FormControl<string[] | null>;
  /** Reseller tiers the material is for; empty means every tier. */
  resellerTiers: FormControl<ResellerTier[] | null>;
}
