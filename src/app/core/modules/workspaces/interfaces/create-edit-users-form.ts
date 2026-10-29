import { FormControl, FormGroup } from "@angular/forms";

export interface CreateEditUserForm {
  /** Tenant id */
  tenantId: FormControl<string | null>;
  /** Tenant name. */
  tenantName: FormControl<string | null>;
  /** User name. */
  name: FormControl<string | null>;
  /** User surname. */
  surname: FormControl<string | null>;
  /** User email. */
  email: FormControl<string | null>;
  /** Account type of the user (set on creation only). */
  accountType: FormControl<'CLIENT' | 'PROFESSIONAL' | null>;
  /** User status. */
  status: FormControl<string | null>;
  /** Custom attributes of the user. */
  customAttributes: FormGroup;
  /** Additional data related to the user. */
  data: FormGroup;
  /** Cognito roles assigned to the user. */
  roles: FormControl<string[] | null>;
  /** Whether the user is the referent of its tenant, who accepts the contract. */
  referent: FormControl<boolean>;
}