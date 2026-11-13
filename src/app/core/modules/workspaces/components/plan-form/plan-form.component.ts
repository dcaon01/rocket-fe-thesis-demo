import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { PlanStatusDirective } from '../../../../directives/plan-status.directive';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleDollarSign, lucideFileText, lucideGripVertical, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import Sortable from 'sortablejs';
import { CoreAssistance, CoreResponsePlanDto } from '../../../../../../../libs/api/src';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { PaymentType } from '../../../../enums/payment-type.enum';
import { PlanAudience } from '../../../../enums/plan-audience.enum';
import { PlanStatus } from '../../../../enums/plan-status.enum';
import { PlanType } from '../../../../enums/plan-type.enum';
import { TierType } from '../../../../enums/tier-type.enum';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PaymentTypePipe } from '../../../../pipes/payment-type/payment-type.pipe';
import { PlanAudiencePipe } from '../../../../pipes/plan-audience/plan-audience.pipe';
import { PlanStatusPipe } from '../../../../pipes/plan-status/plan-status.pipe';
import { PlanTypePipe } from '../../../../pipes/plan-type/plan-type.pipe';
import { CreateEditPlanForm, PlanAssistanceForm, PlanTierForm } from '../../interfaces/create-edit-plan-form.interface';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { MoneyInputDirective } from '../../../../directives/money-input.directive';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

@Component({
  selector: 'rocket-plan-form',
  imports: [
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    ...HlmSwitchImports,
    ...HlmTableImports,
    ...HlmTabsImports,
    ...HlmDialogImports,
    ...HlmTooltipImports,
    ...BrnDialogImports,
    ReactiveFormsModule,
    NgIcon,
    MoneyInputDirective,
    PaymentTypePipe,
    PlanAudiencePipe,
    PlanStatusPipe,
    PlanTypePipe,
    CurrencyPipe,
    ...HlmCardImports,
    StepListComponent,
    PlanStatusDirective,
  ],
  providers: [
    provideIcons({
      lucideFileText,
      lucideCircleDollarSign,
      lucidePlus,
      lucideTrash2,
      lucideGripVertical,
    })
  ],
  templateUrl: './plan-form.component.html',
  styleUrl: './plan-form.component.css'
})
export class PlanFormComponent {
  /** Products cache service instance. */
  private readonly _productsCache = inject(ProductsCacheService);

  /** Product id from the workspace route. */
  private readonly _productId = inject(ActivatedRoute).snapshot.params['productId'];

  /** Plan data to edit. */
  planData = input<CoreResponsePlanDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Whether the form is shown read-only, to users who cannot edit plans. */
  readonly = input<boolean>(false);

  /** Current product from the cache, used to gate the available audiences. */
  currentProduct = computed(() => this._productsCache.products().find(product => product.id === this._productId));

  /** Audiences selectable for the current product, gated by its feature flags. */
  availableAudiences = computed<PlanAudience[]>(() => {
    const product = this.currentProduct();
    const audiences = [PlanAudience.Company];
    if (product?.professionalPlansEnabled) audiences.push(PlanAudience.Professional);
    if (product?.resellerPlansEnabled) audiences.push(PlanAudience.Reseller);
    return audiences;
  });

  /** Reference to the tiers tbody element for SortableJS. */
  tiersTableBody = viewChild<ElementRef>('tiersTableBody');

  /** Dialog reference for tier deletion confirmation. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Dialog content reference for tier deletion confirmation. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /** Index of the tier currently selected for deletion. */
  selectedTierIndex: number | null = null;

  /** Available plan types. */
  planTypes = Object.values(PlanType);

  /** Available billing intervals. */
  billingIntervals = Object.values(PaymentType);

  /**
   * Selectable statuses based on the current plan status, enforcing the
   * lifecycle DRAFT → ACTIVE → ARCHIVED. Includes the current status so
   * the select keeps the value visible even when no transition is desired.
   */
  availableStatuses = computed<PlanStatus[]>(() => {
    const current = this.planData()?.status as PlanStatus | undefined;
    switch (current) {
      case PlanStatus.Draft:
        return [PlanStatus.Draft, PlanStatus.Active];
      case PlanStatus.Active:
        return [PlanStatus.Active, PlanStatus.Archived];
      case PlanStatus.Archived:
        return [PlanStatus.Archived];
      default:
        return [];
    }
  });

  /** Available tier types (only SEATS for plans). */
  tiersTypes: TierType[] = [TierType.Seats];

  /** Form group for creating or editing a plan. */
  planForm = new FormGroup<CreateEditPlanForm>({
    name: new FormControl<string | null>(null, [Validators.required]),
    description: new FormControl<string | null>(null),
    type: new FormControl<PlanType | null>(null, [Validators.required]),
    audience: new FormControl<PlanAudience | null>(PlanAudience.Company, [Validators.required]),
    offStripe: new FormControl<boolean | null>(false),
    currency: new FormControl<string | null>({ value: 'EUR', disabled: true }, [Validators.required]),
    status: new FormControl<PlanStatus | null>(null),
    billingInterval: new FormControl<PaymentType | null>(null),
    baseCost: new FormControl<number | null>(null, [Validators.min(0)]),
    termMonths: new FormControl<number | null>(null),
    noticeDays: new FormControl<number | null>(null, [Validators.min(0)]),
    tiersType: new FormControl<TierType | null>(null),
    tiers: new FormArray<FormGroup<PlanTierForm>>([]),
    activationFee: new FormControl<number | null>(null, [Validators.min(0)]),
    assistance: new FormGroup<PlanAssistanceForm>({
      amount: new FormControl<number | null>(null, [Validators.min(0)]),
      label: new FormControl<string | null>(null),
    }),
  });

  /** Ordered definition of the form sections shown in the sidebar navigation. */
  tabs = computed<StepTab[]>(() => [
    { id: 'info', label: 'Informazioni', icon: 'lucideFileText' },
    { id: 'pricing', label: 'Tariffazione', icon: 'lucideCircleDollarSign' },
  ]);

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(this.tabs, this.creating, sectionsComplete(this.planForm, {
    info: ['name', 'description', 'type', 'audience', 'currency', 'status'],
    pricing: ['offStripe', 'billingInterval', 'baseCost', 'termMonths', 'noticeDays', 'tiersType', 'tiers', 'activationFee', 'assistance'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.planForm);

  /** Currently selected plan type, used to drive conditional UI. */
  selectedType = signal<PlanType | null>(null);

  /** Currently selected audience, used to drive the offStripe derivation. */
  selectedAudience = signal<PlanAudience | null>(PlanAudience.Company);

  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Whether the external billing switch is offered: without Stripe every plan is billed outside it. */
  readonly integrationsEnabled = INTEGRATIONS_ENABLED;

  /** Whether the plan is off Stripe (prices informational only). */
  isOffStripe = signal<boolean>(false);

  /** Whether the base cost is required for the selected type (ONE_TIME / RECURRING_FLAT carry the price here). */
  isBaseCostRequired = computed(() =>
    this.selectedType() === PlanType.OneTime || this.selectedType() === PlanType.RecurringFlat
  );

  /** Whether the billing interval is relevant for the selected type. */
  isBillingIntervalRelevant = computed(() =>
    this.selectedType() === PlanType.TieredVolume || this.selectedType() === PlanType.RecurringFlat
  );

  /** Whether tiers are relevant for the selected type. */
  isTieredVolume = computed(() => this.selectedType() === PlanType.TieredVolume);

  /** Whether the term (months) is relevant for the selected type (ONE_TIME only). */
  isTermMonthsRelevant = computed(() => this.selectedType() === PlanType.OneTime);

  /** Whether the plan definition can still be modified (CREATE or DRAFT plans only); otherwise its values show as text. */
  isEditable = computed(() => !this.readonly() && (!this.planData() || this.planData()?.status === PlanStatus.Draft));

  /** Whether the status can still change: an active plan can be archived, an archived one is final. */
  isStatusEditable = computed(() => !this.readonly() && this.planData()?.status !== PlanStatus.Archived);

  /** Getter for tiers controls as an array of FormGroups. */
  get tiersControls(): FormGroup<PlanTierForm>[] {
    return (this.planForm.get('tiers') as FormArray).controls as FormGroup<PlanTierForm>[];
  }

  /**
   * Constructor: wire up reactive effects to populate the form on edit
   * and to keep conditional fields aligned with the selected plan type.
   */
  constructor() {
    // Track the active type to drive conditional rendering and validators.
    this.planForm.get('type')!.valueChanges.subscribe(type => {
      this.selectedType.set(type);
      this._applyTypeValidators(type);
    });

    // Track the audience to derive and lock offStripe for reseller plans.
    this.planForm.get('audience')!.valueChanges.subscribe(audience => {
      this.selectedAudience.set(audience);
      this._applyAudienceRules(audience);
    });

    // Track the offStripe value for the informational note.
    this.planForm.get('offStripe')!.valueChanges.subscribe(offStripe => {
      this.isOffStripe.set(!!offStripe);
    });

    // Populate the form when planData changes.
    effect(() => {
      const plan = this.planData();
      if (!plan) return;

      // Replace the tiers FormArray with one matching the plan tiers.
      const tiersArray = new FormArray<FormGroup<PlanTierForm>>(
        (plan.tiers ?? []).map(tier => new FormGroup<PlanTierForm>({
          minValue: new FormControl<number | null>(tier.minValue),
          maxValue: new FormControl<number | null>(tier.maxValue),
          price: new FormControl<number | null>(tier.price, [Validators.required, Validators.min(0)]),
        }))
      );
      this.planForm.setControl('tiers', tiersArray);

      this.planForm.patchValue({
        name: plan.name ?? null,
        description: plan.description ?? null,
        type: (plan.type as PlanType) ?? null,
        offStripe: plan.offStripe ?? false,
        audience: (plan.audience as PlanAudience) ?? PlanAudience.Company,
        currency: plan.currency ?? 'EUR',
        status: (plan.status as PlanStatus) ?? null,
        billingInterval: (plan.billingInterval as PaymentType) ?? null,
        baseCost: plan.baseCost ?? null,
        termMonths: plan.termMonths ?? null,
        noticeDays: plan.noticeDays ?? null,
        tiersType: (plan.tiersType as TierType) ?? null,
        activationFee: plan.activationFeeCents != null ? plan.activationFeeCents / 100 : null,
        assistance: {
          amount: plan.assistance ? plan.assistance.amountCents / 100 : null,
          label: plan.assistance?.label ?? null,
        },
      });

      // status is only meaningful when editing.
      this.planForm.get('status')!.setValidators([Validators.required]);
      this.planForm.get('status')!.updateValueAndValidity();

      // Once the plan is ACTIVE or ARCHIVED its definition is frozen.
      // ACTIVE plans keep the status editable so they can be archived;
      // ARCHIVED is terminal and disables the status too.
      if (plan.status === PlanStatus.Active) {
        this.planForm.disable();
        this.planForm.get('status')!.enable();
      } else if (plan.status === PlanStatus.Archived) {
        this.planForm.disable();
      }
    });

    // Freeze the whole form for read-only users, after the data has been applied.
    effect(() => {
      this.planData();
      if (this.readonly()) {
        untracked(() => this.planForm.disable({ emitEvent: false }));
      }
    });

    // Reset the dialog state when closed externally.
    effect(() => {
      const state = this.dialogContent()?.state();
      if (state === 'closed') {
        this.closeDeleteTierDialog();
      }
    });

    // Initialize SortableJS on the tiers table whenever it appears in the view.
    // The table is rendered conditionally based on the selected plan type, so
    // we cannot rely on ngAfterViewInit alone.
    let sortableInstance: Sortable | null = null;
    effect(() => {
      const tableBody = this.tiersTableBody();
      if (tableBody && !sortableInstance) {
        sortableInstance = Sortable.create(tableBody.nativeElement, {
          animation: 150,
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag',
          onEnd: (event) => {
            if (event.oldIndex !== undefined && event.newIndex !== undefined) {
              const formArray = this.planForm.get('tiers') as FormArray;
              const control = formArray.at(event.oldIndex);
              formArray.removeAt(event.oldIndex);
              formArray.insert(event.newIndex, control);
            }
          }
        });
      } else if (!tableBody && sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
      }
    });
  }

  /**
   * Adds a new tier row to the tiers FormArray.
   * @param event the click event to prevent default form submission.
   */
  addTier(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const tiersArray = this.planForm.get('tiers') as FormArray<FormGroup<PlanTierForm>>;
    const isFirst = tiersArray.length === 0;
    tiersArray.push(new FormGroup<PlanTierForm>({
      minValue: new FormControl<number | null>(isFirst ? 0 : null),
      maxValue: new FormControl<number | null>(null),
      price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    }));
    tiersArray.markAsDirty();
  }

  /**
   * Opens the delete tier confirmation dialog for a given index.
   * @param index the index of the tier to delete.
   */
  openDeleteTierDialog(index: number): void {
    this.selectedTierIndex = index;
    this.dialog()?.open();
  }

  /**
   * Closes the delete tier confirmation dialog.
   */
  closeDeleteTierDialog(): void {
    this.selectedTierIndex = null;
    this.dialog()?.close();
  }

  /**
   * Confirms deletion of the selected tier.
   */
  deleteTier(): void {
    if (this.selectedTierIndex === null) return;
    const tiersArray = this.planForm.get('tiers') as FormArray;
    tiersArray.removeAt(this.selectedTierIndex);
    tiersArray.markAsDirty();
    this.closeDeleteTierDialog();
  }

  /**
   * Builds the assistance component in the shape the API takes, with the amount in cents.
   * @returns the assistance, or null when no amount was filled in.
   */
  buildAssistance(): CoreAssistance | null {
    const assistance = this.planForm.controls.assistance.getRawValue();
    if (assistance.amount == null) {
      return null;
    }
    return {
      amountCents: Math.round(assistance.amount * 100),
      ...(assistance.label ? { label: assistance.label } : {}),
    };
  }

  /**
   * Applies validators on conditional fields based on the selected plan type.
   * @param type the currently selected plan type.
   */
  private _applyTypeValidators(type: PlanType | null): void {
    const billingInterval = this.planForm.get('billingInterval')!;
    const baseCost = this.planForm.get('baseCost')!;
    const termMonths = this.planForm.get('termMonths')!;
    const tiersType = this.planForm.get('tiersType')!;

    // Reset all conditional validators (baseCost still bounded to >= 0).
    billingInterval.clearValidators();
    baseCost.setValidators([Validators.min(0)]);
    termMonths.clearValidators();
    tiersType.clearValidators();

    if (type === PlanType.TieredVolume) {
      billingInterval.setValidators([Validators.required]);
      tiersType.setValidators([Validators.required]);
      // Default tiersType to SEATS if not set.
      if (!tiersType.value) tiersType.setValue(TierType.Seats);
    } else if (type === PlanType.RecurringFlat) {
      billingInterval.setValidators([Validators.required]);
      baseCost.setValidators([Validators.required, Validators.min(0)]);
    } else if (type === PlanType.OneTime) {
      baseCost.setValidators([Validators.required, Validators.min(0)]);
      termMonths.setValidators([Validators.required, Validators.min(1)]);
    }

    billingInterval.updateValueAndValidity();
    baseCost.updateValueAndValidity();
    termMonths.updateValueAndValidity();
    tiersType.updateValueAndValidity();
  }

  /**
   * Derives and locks the offStripe flag based on the selected audience:
   * reseller plans are never synced with Stripe.
   * @param audience the currently selected audience.
   */
  private _applyAudienceRules(audience: PlanAudience | null): void {
    const offStripe = this.planForm.get('offStripe')!;

    if (audience === PlanAudience.Reseller) {
      if (!offStripe.value) {
        offStripe.setValue(true);
        offStripe.markAsDirty();
      }
      offStripe.disable();
    } else if (this.isEditable()) {
      offStripe.enable();
    }
  }
}
