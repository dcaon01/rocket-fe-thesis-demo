import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucidePencil, lucidePlus, lucideSearch, lucideTrash2, lucideInbox, lucideEye } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmError, HlmHint } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { finalize, map } from 'rxjs';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { PlanStatusDirective } from '../../../../directives/plan-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { PlanStatus } from '../../../../enums/plan-status.enum';
import { PaymentTypePipe } from '../../../../pipes/payment-type/payment-type.pipe';
import { PlanAudiencePipe } from '../../../../pipes/plan-audience/plan-audience.pipe';
import { PlanStatusPipe } from '../../../../pipes/plan-status/plan-status.pipe';
import { PlanTypePipe } from '../../../../pipes/plan-type/plan-type.pipe';
import { CoreResponsePlanDto } from '../../../../../../../libs/api/src';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { PlansApiService, PlansFilters } from '../../../../services/api-services/plans/plans-api.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterPlansForm } from '../../interfaces/filter-plans-form.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Values of the plan filters. */
type PlanFilterValues = ReturnType<FormGroup<FilterPlansForm>['getRawValue']>;

/** Filters the list opens with, archived plans left out, and that the reset brings back. */
const DEFAULT_PLAN_FILTERS: PlanFilterValues = { status: [PlanStatus.Draft, PlanStatus.Active], name: null };

/** Same defaults for a reseller, who never sees a draft. */
const RESELLER_PLAN_FILTERS: PlanFilterValues = { status: [PlanStatus.Active], name: null };

@Component({
  selector: 'rocket-plans',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmTableImports,
    ...HlmLabelImports,
    ...HlmDialogImports,
    ...HlmTooltipImports,
    ...BrnDialogImports,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    NgIcon,
    ReactiveFormsModule,
    HlmHint,
    HlmError,
    PaymentTypePipe,
    PlanAudiencePipe,
    PlanStatusPipe,
    PlanTypePipe,
    PlanStatusDirective,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideEye, lucideInbox,
      lucidePlus,
      lucidePencil,
      lucideTrash2,
      lucideSearch,
    })
  ],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.css'
})
export class PlansComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Pages of the plans. */
  readonly pager = inject<CursorPaginationService<CoreResponsePlanDto>>(CursorPaginationService);

  /** Plans API service instance. */
  private readonly _plansApiService = inject(PlansApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the user can create, edit and delete plans. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManagePlans));

  /** Whether the user works for a reseller, who reads only the plans meant for resellers and out of draft. */
  readonly isReseller = this._permissions.isReseller;

  /** Plan statuses offered by the status filter: a reseller never sees a draft. */
  statusOptions: ComboboxOption[] = Object.values(PlanStatus)
    .filter(status => !this.isReseller() || status !== PlanStatus.Draft)
    .map(status => ({ value: status, label: new PlanStatusPipe().transform(status) }));

  /** Filters the list opens with and that the reset brings back. */
  private readonly _defaultFilters = this.isReseller() ? RESELLER_PLAN_FILTERS : DEFAULT_PLAN_FILTERS;

  /** Form group for filtering plans. */
  plansFilterForm = new FormGroup<FilterPlansForm>({
    status: new FormControl<string[] | null>(this._defaultFilters.status),
    name: new FormControl<string | null>(this._defaultFilters.name),
  });

  /** Filters applied to the list. */
  appliedFilters = signal<PlanFilterValues>(this._defaultFilters);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.plansFilterForm.valueChanges.pipe(map(() => this.plansFilterForm.getRawValue())),
    { initialValue: this.plansFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), this._defaultFilters));

  /** Loading state signal. */
  isLoading = signal<boolean>(false);

  /** Form group for deleting a plan. */
  deleteForm = new FormGroup({
    name: new FormControl<string>('', [Validators.required])
  });

  /** Error message signal for the delete plan form. */
  errorMessage = signal<string | null>(null);

  /** Selected plan for deletion. */
  selectedPlan: CoreResponsePlanDto | null = null;

  /** Dialog reference. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Dialog content reference. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page whenever the applied filters change.
    effect(() => {
      const filters = this.appliedFilters();
      const productId = this._activatedRoute.snapshot.paramMap.get('productId') || '';

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._plansApiService.listPlans(page, {
        productId,
        status: orUndefined(filters.status) as PlansFilters['status'],
        name: orUndefined(filters.name),
      })));
    });

    // Manage dialog state changes.
    effect(() => {
      const state = this.dialogContent()?.state();
      if (state === 'closed') {
        this.closeDeletePlanDialog();
      }
    });
  }

  /**
   * Reads the current page again.
   */
  loadPlans(): void {
    this.pager.reload();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.plansFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.plansFilterForm.reset(this._defaultFilters);
    this.appliedFilters.set(this._defaultFilters);
  }

  /**
   * Navigates to the plan creation page.
   */
  goToCreatePlan(): void {
    this._router.navigate(['create'], { relativeTo: this._activatedRoute });
  }

  /**
   * Navigates to the plan edit page.
   * @param planId the identifier of the plan to edit.
   */
  goToEditPlan(planId: string): void {
    this._router.navigate(['edit', planId], { relativeTo: this._activatedRoute });
  }

  /**
   * Opens the delete plan confirmation dialog.
   * @param planId the identifier of the plan.
   */
  openDeletePlanDialog(planId: string): void {
    this.selectedPlan = this.pager.items().find(p => p.id === planId) || null;
    this.dialog()?.open();
  }

  /**
   * Closes the delete plan confirmation dialog.
   */
  closeDeletePlanDialog(): void {
    this.selectedPlan = null;
    this.deleteForm.reset();
    this.errorMessage.set(null);
    this.dialog()?.close();
  }

  /**
   * Deletes the selected plan.
   */
  deletePlan(): void {
    const productId = this._activatedRoute.snapshot.paramMap.get('productId') || '';
    const input = this.deleteForm.value;
    if (!this.selectedPlan) return;

    if (input.name === this.selectedPlan.name) {
      this.isLoading.set(true);
      this._plansApiService.deletePlan(productId, this.selectedPlan.id).pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.closeDeletePlanDialog();
          this.loadPlans();
        })
      ).subscribe();
    } else {
      this.deleteForm.reset();
      this.errorMessage.set('Il nome del piano non corrisponde.');
    }
  }
}
