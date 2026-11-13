import { FormControl } from "@angular/forms";
import { Profile } from "../../../enums/profile.enum";

/**
 * Interface representing the structure of the create/edit collaborator form.
 */
export interface CreateEditCollaboratorForm {
  /** The collaborator's first name. */
  name: FormControl<string | null>;
  /** The collaborator's family name. */
  familyName: FormControl<string | null>;
  /** The collaborator's email address. */
  email: FormControl<string | null>;
  /** Whether the collaborator is enabled or not. */
  enabled: FormControl<boolean | null>;
  /** The profile the collaborator holds: profiles are not cumulative. */
  profile: FormControl<Profile | null>;
}
