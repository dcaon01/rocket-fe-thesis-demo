import { FormControl, FormGroup } from "@angular/forms";
import { ProvisionUserForm } from "../../orders/interfaces/provision-line-form.interface";
import { TenantOrigin } from "../enums/tenant-origin.enum";

export interface CreateEditTenantForm {
  /** Name of the company. */
  name: FormControl<string | null>;
  /** Description of the company. */
  description: FormControl<string | null>;
  /** Account type of the tenant (set on creation only). */
  accountType: FormControl<'CLIENT' | 'PROFESSIONAL' | null>;
  /** Status of the company. */
  status?: FormControl<string | null>;
  /** Additional data related to the company. */
  data: FormGroup;
  /** Code of the contract governing the tenant, read only. */
  contractCode: FormControl<string | null>;
  /** Where the tenant comes from, on creation. */
  origin: FormControl<TenantOrigin>;
  /** Trial ID associated with the company. */
  trialId: FormControl<string | null>;
  /** Trial email associated with the company. */
  trialEmail: FormControl<string | null>;
  /** Order of the line the tenant is born from, or the line it takes once its contract is over. */
  orderId: FormControl<string | null>;
  /** Referent of a tenant born from an order line, who accepts the contract. */
  referent: FormGroup<ProvisionUserForm>;
}
