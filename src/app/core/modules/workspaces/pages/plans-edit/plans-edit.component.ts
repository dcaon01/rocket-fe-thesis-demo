import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlay } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { finalize } from 'rxjs';
import { CoreTier, CoreUpdatePlanDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { PlanStatus } from '../../../../enums/plan-status.enum';
import { PlansApiService } from '../../../../services/api-services/plans/plans-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { PlanFormComponent } from '../../components/plan-form/plan-form.component';
import { CreateEditPlanForm } from '../../interfaces/create-edit-plan-form.interface';

@Component({
  selector: 'rocket-plans-edit',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    PageHeaderComponent,
    PlanFormComponent,
    NgIcon,
  ],
  providers: [provideIcons({ lucidePlay })],
  templateUrl: './plans-edit.component.html',
  styleUrl: './plans-edit.component.css'
})
export class PlansEditComponent {
  /** Plans API service. */
  private readonly _plansApiService = inject(PlansApiService);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Activated route service. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Permissions service. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Plan statuses, for the template. */
  readonly PlanStatus = PlanStatus;

  /** Whether the user can edit plans. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManagePlans));

  /** Signal holding the plan data to edit. */
  readonly planData = toSignal(this._plansApiService.getPlan(
    this._activatedRoute.snapshot.params['productId'],
    this._activatedRoute.snapshot.params['planId']
  ));

  /** View child reference to the plan form component. */
  form = viewChild<PlanFormComponent>('form');

  /** Dialog reference for the activation confirmation. */
  activationDialog = viewChild<BrnDialog>('activationDialog');

  /** Pending update DTO, stored while waiting for activation confirmation. */
  private readonly _pendingDto = signal<CoreUpdatePlanDto | null>(null);

  /**
   * Updates an existing plan using the provided form data.
   * If the update promotes the plan to ACTIVE, asks for confirmation first
   * (since once active the plan cannot be modified).
   * @param planForm the form group containing the updated plan data.
   */
  updatePlan(planForm: FormGroup<CreateEditPlanForm>): void {
    if (!planForm.dirty) return;

    const updatePlanDto = this._buildUpdateDto(planForm);

    const isActivating = planForm.get('status')?.dirty
      && planForm.value.status === PlanStatus.Active
      && this.planData()?.status === PlanStatus.Draft;

    if (isActivating) {
      this._pendingDto.set(updatePlanDto);
      this.activationDialog()?.open();
      return;
    }

    this._sendUpdate(updatePlanDto);
  }

  /**
   * Asks to activate the draft as it is saved.
   */
  activatePlan(): void {
    this._pendingDto.set({ status: PlanStatus.Active });
    this.activationDialog()?.open();
  }

  /**
   * Confirms the activation: sends the previously-built update DTO.
   */
  confirmActivation(): void {
    const dto = this._pendingDto();
    if (!dto) return;
    this.activationDialog()?.close();
    this._sendUpdate(dto);
    this._pendingDto.set(null);
  }

  /**
   * Cancels the activation and closes the dialog without sending the update.
   */
  cancelActivation(): void {
    this._pendingDto.set(null);
    this.activationDialog()?.close();
  }

  /**
   * Builds the update DTO from the dirty fields of the form; a cleared optional field is sent as null, which removes it.
   * @param planForm the form group containing the updated plan data.
   * @returns the update DTO.
   */
  private _buildUpdateDto(planForm: FormGroup<CreateEditPlanForm>): CoreUpdatePlanDto {
    const updatePlanDto: CoreUpdatePlanDto = {};

    if (planForm.get('name')?.dirty) updatePlanDto.name = planForm.value.name ?? undefined;
    if (planForm.get('description')?.dirty) updatePlanDto.description = planForm.value.description || null;
    if (planForm.get('type')?.dirty) updatePlanDto.type = planForm.value.type ?? undefined;
    if (planForm.get('currency')?.dirty) updatePlanDto.currency = planForm.value.currency ?? undefined;
    if (planForm.get('status')?.dirty) updatePlanDto.status = planForm.value.status ?? undefined;
    if (planForm.get('billingInterval')?.dirty) updatePlanDto.billingInterval = planForm.value.billingInterval ?? null;
    if (planForm.get('baseCost')?.dirty) updatePlanDto.baseCost = planForm.value.baseCost ?? null;
    if (planForm.get('termMonths')?.dirty) updatePlanDto.termMonths = planForm.value.termMonths ?? null;
    if (planForm.get('noticeDays')?.dirty) updatePlanDto.noticeDays = planForm.value.noticeDays ?? null;
    if (planForm.get('tiersType')?.dirty) updatePlanDto.tiersType = planForm.value.tiersType ? 'SEATS' : null;
    if (planForm.get('audience')?.dirty) updatePlanDto.audience = planForm.value.audience ?? undefined;
    if (planForm.get('offStripe')?.dirty) updatePlanDto.offStripe = planForm.getRawValue().offStripe ?? false;
    if (planForm.get('activationFee')?.dirty) {
      const activationFee = planForm.value.activationFee;
      updatePlanDto.activationFeeCents = activationFee != null ? Math.round(activationFee * 100) : null;
    }
    if (planForm.get('assistance')?.dirty) updatePlanDto.assistance = this.form()?.buildAssistance();

    if ((planForm.get('tiers') as FormArray).dirty) {
      const tiers: CoreTier[] = (planForm.value.tiers ?? []).map(tier => ({
        minValue: tier.minValue ?? null,
        maxValue: tier.maxValue ?? null,
        price: tier.price!,
      }));
      updatePlanDto.tiers = tiers;
    }

    return updatePlanDto;
  }

  /**
   * Sends the update request to the API and navigates back to the list on success.
   * @param dto the update DTO to send.
   */
  private _sendUpdate(dto: CoreUpdatePlanDto): void {
    const productId = this._activatedRoute.snapshot.params['productId'];
    const planId = this._activatedRoute.snapshot.params['planId'];

    this._plansApiService.updatePlan(productId, planId, dto).pipe(
      finalize(() => this._router.navigate(['../../'], { relativeTo: this._activatedRoute }))
    ).subscribe();
  }
}
