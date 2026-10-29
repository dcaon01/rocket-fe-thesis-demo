import { FormControl } from "@angular/forms";
import { TrialStatus } from "../../../enums/trial-status.enum";
import { UsersLimitType } from "../../../enums/users-limit-type.enum";

/**
 * Interface representing the structure of the create/edit trial form.
 */
export interface CreateEditTrialForm {
  /** Email associated with the trial. */
  associatedEmail: FormControl<string | null>;
  /** Description of the trial. */
  description: FormControl<string | null>;
  /** Whether to set a custom expiration date. */
  hasCustomExpiration: FormControl<boolean | null>;
  /** Expiration date of the trial. */
  expiresAt: FormControl<Date | null>;
  /** Whether the trial never expires. */
  perpetual: FormControl<boolean | null>;
  /** Status of the trial (only for edit). */
  status: FormControl<TrialStatus | null>;
  /** Type of users limit for the trial. */
  usersLimitType: FormControl<UsersLimitType | null>;
  /** Custom maximum number of users allowed for the trial. */
  usersLimit: FormControl<number | null>;
}
