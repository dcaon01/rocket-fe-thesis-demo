import { Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize } from 'rxjs';
import { CognitoCognitoUserUpdateDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from "../../../../components/page-header/page-header.component";
import { CollaboratorsApiService } from '../../../../services/api-services/collaborators/collaborators-api.service';
import { CollaboratorFormComponent } from '../../components/collaborator-form/collaborator-form.component';
import { CreateEditCollaboratorForm } from '../../interfaces/create-edit-collaborator-form.interface';

/**
 * Component for editing an existing collaborator, in the global area or in a reseller workspace.
 */
@Component({
  selector: 'rocket-collaborators-edit',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent, 
    CollaboratorFormComponent
  ],
  templateUrl: './collaborators-edit.component.html',
  styleUrl: './collaborators-edit.component.css'
})
export class CollaboratorsEditComponent {
  /** Collaborators api service. */
  private readonly _collaboratorsService = inject(CollaboratorsApiService);

  /** Activated route. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Signal to hold collaborator data for editing. */
  readonly collaboratorData = toSignal(
    this._collaboratorsService.getCollaboratorById(this._activatedRoute.snapshot.params['collaboratorId'])
  );

  /** View child reference to the collaborator form component. */
  form = viewChild<CollaboratorFormComponent>('form');

  /**
   * Method to handle collaborator editing logic.
   * @param collaboratorForm the collaborator form data got from the child form component.
   */
  editCollaborator(collaboratorForm: FormGroup<CreateEditCollaboratorForm>) {
    if (!collaboratorForm.dirty) return;

    const updateCollaborator: CognitoCognitoUserUpdateDto = {};

    if (collaboratorForm.get('name')?.dirty) updateCollaborator.name = collaboratorForm.value.name ?? undefined;
    if (collaboratorForm.get('familyName')?.dirty) updateCollaborator.surname = collaboratorForm.value.familyName ?? undefined;
    if (collaboratorForm.get('enabled')?.dirty) updateCollaborator.status = collaboratorForm.value.enabled ? 'active' : 'inactive';
    if (collaboratorForm.get('profile')?.dirty) updateCollaborator.roles = [collaboratorForm.value.profile!];

    this._collaboratorsService.updateCollaborator(this.collaboratorData()?.sub ?? '', updateCollaborator).pipe(finalize(() => {
      this._router.navigate(['../..'], { relativeTo: this._activatedRoute });
    })).subscribe();
  }
}
