import { FormArray, FormControl, FormGroup } from '@angular/forms';

/** Interface representing the tenant part of the provisioning form of a line. */
export interface ProvisionTenantForm {
  /** Name of the tenant. */
  name: FormControl<string | null>;
  /** Description of the tenant. */
  description: FormControl<string | null>;
  /** Fields of the product's tenant structure. */
  data: FormGroup;
}

/** Interface representing one user of the provisioning form of a line. */
export interface ProvisionUserForm {
  /** Email of the user, which the product invites. */
  email: FormControl<string | null>;
  /** First name of the user. */
  name: FormControl<string | null>;
  /** Last name of the user. */
  surname: FormControl<string | null>;
  /** Roles of the user, among the product's ones. */
  roles: FormControl<string[]>;
  /** Fields of the product's user structure. */
  data: FormGroup;
}

/** Interface representing the provisioning form of a line: the tenant and its users, the first being the referent. */
export interface ProvisionLineForm {
  /** The tenant to create. */
  tenant: FormGroup<ProvisionTenantForm>;
  /** The users to create on the tenant. */
  users: FormArray<FormGroup<ProvisionUserForm>>;
}
