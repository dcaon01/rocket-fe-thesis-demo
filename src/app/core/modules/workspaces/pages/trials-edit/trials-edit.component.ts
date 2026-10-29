import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlay } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { CoreUpdateTrialDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { TrialStatus } from '../../../../enums/trial-status.enum';
import { TrialsApiService } from '../../../../services/api-services/trials/trials-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { TrialFormComponent } from '../../components/trial-form/trial-form.component';
import { CreateEditTrialForm } from '../../interfaces/create-edit-trial-form.interface';

@Component({
  selector: 'rocket-trials-edit',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    NgIcon,
    PageHeaderComponent,
    TrialFormComponent,
  ],
  providers: [
    provideIcons({
      lucidePlay
    })
  ],
  templateUrl: './trials-edit.component.html',
  styleUrl: './trials-edit.component.css'
})
export class TrialsEditComponent {
  /** Trial status enum reference for template usage. */
  readonly TrialStatus = TrialStatus;

  /** Trials api service. */
  private readonly _trialsApiService = inject(TrialsApiService);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Activated route service. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Permissions service. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the user can edit and activate trials. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageTrials));

  /** Signal to hold trial data for editing. */
  readonly trialData = toSignal(this._trialsApiService.getTrial(
    this._activatedRoute.snapshot.params['productId'],
    this._activatedRoute.snapshot.params['trialId']
  ));

  /** View child reference to the trial form component. */
  form = viewChild<TrialFormComponent>('form');

  /** Dialog reference for activate confirmation. */
  activateDialog = viewChild<BrnDialog>('activateDialog');

  /** Dialog content reference for activate. */
  activateDialogContent = viewChild<HlmDialogContent>('activateDialogContent');

  /**
   * Updates an existing trial.
   * @param trialForm the form group containing the updated trial data.
   */
  updateTrial(trialForm: FormGroup<CreateEditTrialForm>) {
    const productId = this._activatedRoute.snapshot.params['productId'];
    const trialId = this._activatedRoute.snapshot.params['trialId'];

    const isFormDirty = trialForm.dirty;

    // Nothing to save
    if (!isFormDirty) {
      return;
    }

    const updateTrialDto: CoreUpdateTrialDto = {};

    if (trialForm.get('description')?.dirty) updateTrialDto.description = trialForm.value.description || null;
    if (trialForm.get('expiresAt')?.dirty) updateTrialDto.expiresAt = trialForm.value.expiresAt ? trialForm.value.expiresAt.toISOString() : undefined;
    if (trialForm.get('status')?.dirty) updateTrialDto.status = trialForm.value.status ?? undefined;

    this._trialsApiService.updateTrial(productId, trialId, updateTrialDto).subscribe(() => {
      this._router.navigate(['../../'], { relativeTo: this._activatedRoute });
    });
  }

  /**
   * Checks if the form can be submitted.
   * Disables submit if trial is draft.
   * @returns true if the form can be submitted.
   */
  canSubmit(): boolean {
    const trial = this.trialData();
    if (!trial) return false;
    return trial.status !== TrialStatus.Draft;
  }

  /**
   * Opens the activate confirmation dialog.
   */
  openActivateDialog(): void {
    this.activateDialog()?.open();
  }

  /**
   * Closes the activate confirmation dialog.
   */
  closeActivateDialog(): void {
    this.activateDialog()?.close();
  }

  /**
   * Confirms the activation and updates the trial status to ACTIVE.
   */
  confirmActivate(): void {
    const productId = this._activatedRoute.snapshot.params['productId'];
    const trialId = this._activatedRoute.snapshot.params['trialId'];

    const updateDto: CoreUpdateTrialDto = { status: 'ACTIVE' };

    this._trialsApiService.updateTrial(productId, trialId, updateDto).subscribe(() => {
      this._router.navigate(['../../'], { relativeTo: this._activatedRoute });
    });

    this.closeActivateDialog();
  }
}
