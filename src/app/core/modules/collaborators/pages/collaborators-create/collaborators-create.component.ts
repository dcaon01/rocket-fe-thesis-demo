import { Component, computed, inject, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, map, of, switchMap } from 'rxjs';
import { CognitoCognitoUserCreateDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { AccountType } from '../../../../enums/account-type.enum';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { CollaboratorsApiService } from '../../../../services/api-services/collaborators/collaborators-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { CollaboratorFormComponent } from "../../components/collaborator-form/collaborator-form.component";
import { CreateEditCollaboratorForm } from '../../interfaces/create-edit-collaborator-form.interface';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

/**
 * Component for creating a new collaborator.
 * In the global area the collaborator is a Keus account, in the reseller workspace it belongs to that reseller.
 */
@Component({
  selector: 'rocket-collaborators-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    CollaboratorFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './collaborators-create.component.html',
  styleUrl: './collaborators-create.component.css'
})
export class CollaboratorsCreateComponent {
  /** Collaborators api service. */
  private readonly _collaboratorsService = inject(CollaboratorsApiService);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Application context service. */
  private readonly _context = inject(AppContextService);

  /** Activated route. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Router service. */
  private readonly _router = inject(Router);

  /** View child reference to the user form component. */
  form = viewChild<CollaboratorFormComponent>('form');

  /** Whether the page is opened inside a reseller workspace. */
  readonly isResellerWorkspace = computed(() => !!this._context.resellerId());

  /** Account type of the new collaborator, given by the area. */
  readonly accountType = computed(() => this.isResellerWorkspace() ? AccountType.Reseller : AccountType.Collaborator);

  /** Code of the reseller whose workspace is open, the owner of the new collaborator. */
  private readonly _resellerCode = toSignal(
    toObservable(this._context.resellerId).pipe(
      switchMap(resellerId => resellerId
        ? this._resellersApiService.getReseller(resellerId).pipe(map(reseller => reseller.code))
        : of(null)),
    ),
    { initialValue: null },
  );

  /** Whether the page can submit: in a reseller workspace it waits for the reseller code. */
  readonly canSubmit = computed(() => !this.isResellerWorkspace() || !!this._resellerCode());

  /**
   * Handles the creation of a new collaborator.
   * @param collaboratorForm the collaborator form data got from the child form component.
   */
  createCollaborator(collaboratorForm: FormGroup<CreateEditCollaboratorForm>): void {
    const newCollaborator: CognitoCognitoUserCreateDto = {
      email: collaboratorForm.value.email!,
      name: collaboratorForm.value.name!,
      surname: collaboratorForm.value.familyName!,
      groups: [collaboratorForm.value.profile!],
      accountType: this.accountType(),
      ...(this.isResellerWorkspace() ? { resellerCode: this._resellerCode() ?? undefined } : {})
    };

    this._collaboratorsService.createCollaborator(newCollaborator).pipe(finalize(() => {
      this._router.navigate(['..'], { relativeTo: this._activatedRoute });
    })).subscribe();
  }
}
