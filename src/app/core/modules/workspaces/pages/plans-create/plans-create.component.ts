import { Component, inject, viewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CoreCreatePlanDto, CoreTier } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { PlanAudience } from '../../../../enums/plan-audience.enum';
import { PlanType } from '../../../../enums/plan-type.enum';
import { PlansApiService } from '../../../../services/api-services/plans/plans-api.service';
import { PlanFormComponent } from '../../components/plan-form/plan-form.component';
import { CreateEditPlanForm } from '../../interfaces/create-edit-plan-form.interface';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

@Component({
  selector: 'rocket-plans-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    PlanFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './plans-create.component.html',
  styleUrl: './plans-create.component.css'
})
export class PlansCreateComponent {
  /** Plans API service. */
  private readonly _plansApiService = inject(PlansApiService);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Activated route service. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** View child reference to the plan form component. */
  form = viewChild<PlanFormComponent>('form');

  /** Product ID from route parameters. */
  productId = this._activatedRoute.snapshot.params['productId'];

  /**
   * Creates a new plan using the provided form data.
   * @param planForm the form group containing plan details.
   */
  createPlan(planForm: FormGroup<CreateEditPlanForm>): void {
    const value = planForm.getRawValue();
    const type = value.type as PlanType;

    const tiers: CoreTier[] = (value.tiers ?? []).map(tier => ({
      minValue: tier.minValue ?? null,
      maxValue: tier.maxValue ?? null,
      price: tier.price!,
    }));

    const assistance = this.form()?.buildAssistance();

    const createPlanDto: CoreCreatePlanDto = {
      name: value.name!,
      type: type,
      audience: value.audience ?? PlanAudience.Company,
      offStripe: value.offStripe ?? false,
      ...(value.description ? { description: value.description } : {}),
      ...(value.currency ? { currency: value.currency } : {}),
      ...(value.baseCost != null ? { baseCost: value.baseCost } : {}),
      ...(value.activationFee != null ? { activationFeeCents: Math.round(value.activationFee * 100) } : {}),
      ...(assistance ? { assistance } : {}),
      ...(type === PlanType.OneTime && value.termMonths != null ? { termMonths: value.termMonths } : {}),
      ...(type !== PlanType.OneTime && value.noticeDays != null ? { noticeDays: value.noticeDays } : {}),
      ...(type === PlanType.TieredVolume || type === PlanType.RecurringFlat
        ? { billingInterval: value.billingInterval! }
        : {}),
      ...(type === PlanType.TieredVolume
        ? { tiers, tiersType: 'SEATS' as const }
        : {}),
    };

    this._plansApiService.createPlan(this.productId, createPlanDto).subscribe(() => {
      this._router.navigate(['../'], { relativeTo: this._activatedRoute });
    });
  }
}
