import { FormControl } from "@angular/forms";

/**
 * Interface representing the filter form for collaborators in the admin module.
 */
export interface FilterCollaboratorsForm {
  /** Start of the collaborator's first or last name. */
  name: FormControl<string | null>;
  /** Start of the collaborator's email. */
  email: FormControl<string | null>;
  /** Collaborator statuses (ACTIVE, INACTIVE); none means both. */
  status: FormControl<string[] | null>;
}
