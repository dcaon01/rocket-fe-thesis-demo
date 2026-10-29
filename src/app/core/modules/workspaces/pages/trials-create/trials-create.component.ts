import { Component, inject, viewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CoreCreateTrialDto } from '../../../../../../../libs/api/src';
import { UsersLimitType } from '../../../../enums/users-limit-type.enum';
import { PageHeaderComponent } from "../../../../components/page-header/page-header.component";
import { TrialsApiService } from '../../../../services/api-services/trials/trials-api.service';
import { TrialFormComponent } from '../../components/trial-form/trial-form.component';
import { CreateEditTrialForm } from '../../interfaces/create-edit-trial-form.interface';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

@Component({
  selector: 'rocket-trials-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    TrialFormComponent,
    PageHeaderComponent,
    FormToolbarComponent,
  ],
  templateUrl: './trials-create.component.html',
  styleUrl: './trials-create.component.css'
})
export class TrialsCreateComponent {
  /** Trials api service. */
  private readonly _trialsApiService = inject(TrialsApiService);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Activated route service. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** View child reference to the trial form component. */
  form = viewChild<TrialFormComponent>('form');

  /** Product ID from route parameters. */
  productId = this._activatedRoute.snapshot.params['productId'];

  /**
   * Creates a new trial using the provided form data.
   * @param trialForm the form group containing trial details.
   */
  createTrial(trialForm: FormGroup<CreateEditTrialForm>): void {
    const createTrialDto: CoreCreateTrialDto = {
      associatedEmail: trialForm.value.associatedEmail!,
      productId: this.productId,
      description: trialForm.value.description ?? undefined,
      expiresAt: trialForm.getRawValue().perpetual ? undefined : (trialForm.value.expiresAt ? trialForm.value.expiresAt.toISOString() : undefined),
      perpetual: trialForm.getRawValue().perpetual ?? undefined,
      usersLimitType: trialForm.value.usersLimitType!,
      usersLimit: trialForm.value.usersLimitType === UsersLimitType.Custom
        ? (trialForm.getRawValue().usersLimit ?? undefined)
        : undefined,
    }
    this._trialsApiService.createTrial(createTrialDto).subscribe(() => {
      this._router.navigate(['../'], { relativeTo: this._activatedRoute });
    });
  }
}
