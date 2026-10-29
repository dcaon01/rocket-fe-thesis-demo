import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalculator,
  lucideChartLine,
  lucideCircleCheck,
  lucideCircleX,
  lucideEllipsisVertical,
  lucideFileAudio,
  lucideFileText,
  lucideFileUp,
  lucideInfo,
  lucideList,
  lucidePencil,
  lucidePercent,
  lucidePlus,
  lucideTrash2,
  lucideDownload,
  lucidePaperclip,
  lucidePuzzle,
  lucideX,
  lucideInbox,
  lucidePackagePlus,
  lucideServer,
  lucideHourglass
} from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { catchError, distinctUntilChanged, EMPTY, expand, map, of, pairwise, reduce, skip, startWith, Subject, switchMap } from 'rxjs';
import {
  CoreCustomizationEvaluation,
  CoreCustomizationInput,
  CoreOrderLineInput,
  CoreResponseOrderCustomizationDto,
  CoreResponseOrderDto,
  CoreResponseOrderLineDto,
  CoreResponsePlanDto,
  CoreResponseOrderSellerDto,
} from '../../../../../../../libs/api/src';
import { AppArea } from '../../../../enums/app-area.enum';
import { CustomizationKind } from '../../../../enums/customization-kind.enum';
import { CustomizationStatus } from '../../../../enums/customization-status.enum';
import { PlanAudience } from '../../../../enums/plan-audience.enum';
import { PlanStatus } from '../../../../enums/plan-status.enum';
import { PlanType } from '../../../../enums/plan-type.enum';
import { SalesChannel } from '../../../../enums/sales-channel.enum';
import { CustomizationStatusDirective } from '../../../../directives/customization-status.directive';
import { OrderStatusDirective } from '../../../../directives/order-status.directive';
import { CustomizationStatusPipe } from '../../../../pipes/customization-status/customization-status.pipe';
import { OrderRefusalReasonPipe } from '../../../../pipes/order-refusal-reason/order-refusal-reason.pipe';
import { OrderStatusPipe } from '../../../../pipes/order-status/order-status.pipe';
import { PaymentTypePipe } from '../../../../pipes/payment-type/payment-type.pipe';
import { SalesChannelPipe } from '../../../../pipes/sales-channel/sales-channel.pipe';
import { ResellerOwnerPipe } from '../../../../pipes/reseller-owner/reseller-owner.pipe';
import { OrderLineStatusPipe } from '../../../../pipes/order-line-status/order-line-status.pipe';
import { Profile } from '../../../../enums/profile.enum';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { RouterLink } from '@angular/router';
import { CompaniesApiService } from '../../../../services/api-services/companies/companies-api.service';
import { OrdersApiService } from '../../../../services/api-services/orders/orders-api.service';
import { PlansApiService } from '../../../../services/api-services/plans/plans-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { S3OrderEntityType, S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { CreateEditOrderForm, CustomizationEvaluationForm, CustomizationFileValue, OrderCustomizationForm, OrderLineForm } from '../../interfaces/create-edit-order-form.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';
import { COMBOBOX_PAGE_SIZE, remoteOptions } from '../../../../utils/remote-options.util';
import { formSteps, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { OrderLineStatus } from '../../../../enums/order-line-status.enum';
import { SyncState } from '../../../../enums/sync-state.enum';
import { TenantStatus } from '../../../../enums/tenant-status.enum';
import { TenantStatusPipe } from '../../../../pipes/tenant-status/tenant-status.pipe';
import { MoneyInputDirective } from '../../../../directives/money-input.directive';
import { FileDropZoneDirective } from '../../../../directives/file-drop-zone.directive';
import { StepListComponent } from '../../../../components/step-list/step-list.component';
import { CodeItemComponent } from '../../../../components/code-item/code-item.component';

/** Size of the pages that read the active plans of a product, the largest the backend serves. */
const PLANS_PAGE_SIZE = 100;

/** A line with a plan, priced as the backend prices it. Amounts in cents. */
export interface PricedLine {
  /** Name of the product. */
  productName: string;
  /** The plan pricing the line. */
  plan: CoreResponsePlanDto;
  /** Seats sold on the line, for the plans priced by seats. */
  seats: number | null;
  /** Monthly price per seat of the tier the seats fall into, for volume plans. */
  unitPriceCents?: number;
  /** List activation amount. */
  listActivationCents: number;
  /** Discount on the activation, in percent. */
  activationDiscountPercent: number;
  /** Activation amount printed on the offer. */
  offerActivationCents: number;
  /** List amount of the plan, per billing interval or once for one-off plans. */
  listRecurringCents?: number;
  /** Discount on the recurring fee, in percent. */
  recurringDiscountPercent: number;
  /** Amount of the plan printed on the offer. */
  offerRecurringCents?: number;
}

/** Totals of the order, in cents, before and after the discounts. */
export interface EconomicTotals {
  /** One-off list amount: activations and one-off plans. */
  listOneOffCents: number;
  /** One-off amount printed on the offer. */
  offerOneOffCents: number;
  /** Monthly list amount, with the annual plans spread over twelve months. */
  listMonthlyCents: number;
  /** Monthly amount printed on the offer. */
  offerMonthlyCents: number;
}

/** A customization in the economic conditions: quoted, or waiting for its price. */
export interface CustomizationRow {
  /** Product it customizes. */
  label: string;
  /** Evaluation of the back office; a new one waits for its price. */
  status: CustomizationStatus;
  /** The customization as stored, absent until saved. */
  stored?: CoreResponseOrderCustomizationDto;
}

/** Action on a single customization, run by the page that shows the order. */
export type CustomizationAction = 'discount';

/**
 * Returns the kind of S3 file a customization attachment is stored as.
 * @param type the kind of the attachment.
 * @returns the S3 entity type.
 */
export function customizationFileEntity(type: CustomizationFileValue['type']): S3OrderEntityType {
  return type === 'PDF' ? 'ORDER_CUSTOMIZATION_ATTACHMENT' : 'ORDER_CUSTOMIZATION_VOICE_NOTE';
}

/** Outcome of a customization as the quotation dialog keeps it, to restore it on cancel. */
type CustomizationEvaluationValue = ReturnType<FormGroup<CustomizationEvaluationForm>['getRawValue']>;

/** How the quotation dialog opens: to quote, to refuse, or to change an outcome already given. */
export type EvaluationMode = 'quote' | 'refuse' | 'edit';

/**
 * Form of an order request: the company, one line per product and the customization requests.
 * The amounts are a preview of what the backend computes; the files are attached once the order exists.
 */
@Component({
  selector: 'rocket-order-form',
  imports: [
    ...BrnComboboxImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmComboboxImports,
    ...HlmDialogImports,
    ...HlmDropdownMenuImports,
    ...BrnDialogImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...BrnSelectImports,
    ...HlmSelectImports,
    ...HlmTableImports,
    ...HlmTabsImports,
    ...HlmTextareaImports,
    NgIcon,
    ReactiveFormsModule,
    CustomizationStatusDirective,
    OrderStatusDirective,
    CurrencyPipe,
    DatePipe,
    CustomizationStatusPipe,
    OrderRefusalReasonPipe,
    OrderStatusPipe,
    PaymentTypePipe,
    SalesChannelPipe,
    ResellerOwnerPipe,
    OrderLineStatusPipe,
    TenantStatusPipe,
    RouterLink,
    MoneyInputDirective,
    FileDropZoneDirective,
    ...HlmEmptyImports,
    ...HlmCardImports,
    ...HlmItemImports,
    ...HlmTooltipImports,
    ...HlmAlertImports,
    StepListComponent,
    CodeItemComponent,
  ],
  providers: [
    provideIcons({ lucideInbox,
      lucideCalculator,
      lucideChartLine,
      lucideCircleCheck,
      lucideCircleX,
      lucideEllipsisVertical,
      lucideFileAudio,
      lucideFileText,
      lucideFileUp,
      lucideInfo,
      lucideList,
      lucidePercent,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
      lucideDownload,
      lucidePaperclip,
      lucidePuzzle,
      lucideX,
      lucidePackagePlus,
      lucideServer,
      lucideHourglass,
    })
  ],
  templateUrl: './order-form.component.html',
})
export class OrderFormComponent {
  /** Destroy reference, for the subscriptions of the lines. */
  private readonly _destroyRef = inject(DestroyRef);

  /** Companies API service instance. */
  private readonly _companiesApiService = inject(CompaniesApiService);

  /** Plans API service instance. */
  private readonly _plansApiService = inject(PlansApiService);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Orders API service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);

  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Italian VAT rate applied to the gross totals. */
  private readonly _ivaRate = 0.22;

  /** Order to edit; absent when creating. */
  order = input<CoreResponseOrderDto | null>(null);

  /** Whether the form shows a new order, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Whether the user provisions lines: admin and back office of Keus, owner and back office of a reseller, as the backend allows. */
  readonly canProvision = computed(() => this._permissions.hasAnyProfile([
    Profile.KeusAdmin, Profile.KeusBackoffice, Profile.ResellerOwner, Profile.ResellerBackoffice,
  ]));

  /** Address of the orders in the current area: the global queue, or the orders of the open reseller workspace. */
  readonly ordersPath = computed(() => `${this._context.basePath()}/orders`);

  /** Whether the viewer works at a reseller: its orders are all its own, so channel and seller stay hidden. */
  readonly isReseller = this._permissions.isReseller;

  /** Whether the lines have a provisioning status, once the order is confirmed. */
  readonly hasLineStatuses = computed(() => (this.order()?.lines ?? []).some(line => !!line.status));

  /** Whether the form is shown read-only. */
  readonly = input<boolean>(false);

  /** Whether the back office prices or refuses the customizations here, while the rest stays read-only. */
  evaluating = input<boolean>(false);

  /** Why the offer step is disabled, null when the page projects the offer into it. */
  offerHint = input<string | null>('L\'offerta si vede dopo averla generata.');

  /** Actions the user may run on a customization, decided by the page that shows the order. */
  customizationActions = input<(customization: CoreResponseOrderCustomizationDto) => CustomizationAction[]>(() => []);

  /** Whether the company can be chosen: only while creating an editable order. */
  readonly isCompanyEditable = computed(() => !this.readonly() && !this.order());

  /** Reference to the delete dialog. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Reference to the delete dialog content. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /** Line or customization selected for deletion. */
  pendingDeletion: { target: 'line' | 'customization'; index: number } | null = null;

  /** Reference to the quotation dialog. */
  evaluationDialog = viewChild<BrnDialog>('evaluationDialog');

  /** Customization quoted in the dialog, with its outcome as it was on opening, to restore on cancel. */
  quoting = signal<{ index: number; mode: EvaluationMode; snapshot: CustomizationEvaluationValue; pristine: boolean } | null>(null);

  /** Plan types, for the template. */
  readonly PlanType = PlanType;

  /** Customization kinds, for the template. */
  readonly CustomizationKind = CustomizationKind;

  /** Customization statuses, for the outcome chosen by the back office. */
  readonly CustomizationStatus = CustomizationStatus;

  /** Tenant statuses, for the template. */
  readonly TenantStatus = TenantStatus;

  /** Synchronisation states, for the template. */
  readonly SyncState = SyncState;

  /** Label and icon of each action on a customization. */
  readonly customizationActionItems: Record<CustomizationAction, { label: string; icon: string }> = {
    discount: { label: 'Sconto', icon: 'lucidePercent' },
  };

  /** Filter of the comboboxes. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Converts a product identifier to its name, used by the comboboxes for filtering and display. */
  readonly productLabel = (productId: string): string =>
    this.products().find(product => product.id === productId)?.name ?? '';

  /** Converts a plan identifier to its name, used by the comboboxes for filtering and display. */
  readonly planLabel = (planId: string): string =>
    Object.values(this._plansByProduct()).flat().find(plan => plan.id === planId)?.name ?? '';

  /** Converts a company identifier to its legal name and VAT number, used by the combobox for filtering and display. */
  readonly companyLabel = (companyId: string): string => this.companies.labelOf(companyId) ?? '';

  /** Whether reading the seller of the chosen company failed: lines stay blocked until it is read. */
  sellerFailed = signal<boolean>(false);

  /** Form group of the order. */
  orderForm = new FormGroup<CreateEditOrderForm>({
    code: new FormControl<string | null>(null),
    companyId: new FormControl<string | null>(null, [Validators.required]),
    lines: new FormArray<FormGroup<OrderLineForm>>([], { validators: [() => this.sellerFailed() ? { seller: true } : null] }),
    customizations: new FormArray<FormGroup<OrderCustomizationForm>>([]),
  }, { validators: [(form: AbstractControl) => this._contentValidator(form)] });

  /** Companies the order can be placed for, searched by legal name or VAT number; within the reseller of the workspace when one is open. */
  readonly companies = remoteOptions(search =>
    this._companiesApiService.listCompanies({ limit: COMBOBOX_PAGE_SIZE }, {
      name: search,
      resellerCode: this._context.area() === AppArea.ResellerWorkspace ? this._workspaceResellerCode() ?? undefined : undefined,
      // A Keus salesperson opens only direct orders: the customers of a reseller are ordered by the reseller.
      ...(this._permissions.isKeusSalespersonOnly() && { channel: SalesChannel.Direct }),
    }).pipe(map(page => page.items.map(company => ({ value: company.id, label: this._companyLabelOf(company.name, company.vatNumber) })))),
  );

  /** Who sells to the chosen company: channel, enabled products and margin of the reseller; null until resolved. */
  seller = signal<CoreResponseOrderSellerDto | null>(null);

  /** Raw value of the form, as a signal for the economic conditions. */
  private readonly _formValue = toSignal(
    this.orderForm.valueChanges.pipe(map(() => this.orderForm.getRawValue())),
    { initialValue: this.orderForm.getRawValue() },
  );

  /** Lines with a plan, priced as the backend prices them. */
  readonly pricedLines = computed<PricedLine[]>(() => this._formValue().lines.flatMap(line => {
    const plan = this.plansFor(line.productId).find(candidate => candidate.id === line.planId);
    if (!plan) return [];
    const listActivationCents = plan.activationFeeCents ?? 0;
    const listRecurringCents = plan.type !== PlanType.TieredVolume || line.seats ? this._listRecurringCents(plan, line.seats ?? 0) : undefined;
    const activationDiscountPercent = line.activationDiscountPercent ?? 0;
    const recurringDiscountPercent = line.recurringDiscountPercent ?? 0;
    const tier = plan.type === PlanType.TieredVolume && line.seats ? this._tierOf(plan, line.seats) : undefined;
    return [{
      productName: this.products().find(product => product.id === line.productId)?.name ?? '-',
      plan,
      seats: line.seats,
      ...(tier ? { unitPriceCents: Math.round(tier.price * 100) } : {}),
      listActivationCents,
      activationDiscountPercent,
      offerActivationCents: this._applyPercent(listActivationCents, activationDiscountPercent),
      listRecurringCents,
      recurringDiscountPercent,
      offerRecurringCents: listRecurringCents === undefined ? undefined : this._applyPercent(listRecurringCents, recurringDiscountPercent),
    }];
  }));

  /** Customizations of the economic conditions, without the refused ones. */
  readonly customizationRows = computed<CustomizationRow[]>(() => this._formValue().customizations.flatMap(value => {
    const stored = this.order()?.customizations?.find(customization => customization.id === value.id);
    if (stored?.status === CustomizationStatus.Refused) return [];
    return [{
      label: this.customizationLabel(value.kind, value.productId),
      status: (stored?.status as CustomizationStatus | undefined) ?? CustomizationStatus.Requested,
      stored,
    }];
  }));

  /** Totals of the priced lines and of the quoted customizations, whose fee increase is yearly. */
  readonly totals = computed<EconomicTotals>(() => this.customizationRows().reduce((totals, { status, stored }) => {
    if (status !== CustomizationStatus.Quoted || !stored) return totals;
    totals.listOneOffCents += stored.listOneOffCents ?? 0;
    totals.offerOneOffCents += stored.offerOneOffCents ?? 0;
    totals.listMonthlyCents += (stored.listRecurringIncreaseCents ?? 0) / 12;
    totals.offerMonthlyCents += (stored.offerRecurringIncreaseCents ?? 0) / 12;
    return totals;
  }, { ...this._linesTotals() }));

  /** Totals of the priced lines. */
  private readonly _linesTotals = computed<EconomicTotals>(() => this.pricedLines().reduce((totals, line) => {
    totals.listOneOffCents += line.listActivationCents;
    totals.offerOneOffCents += line.offerActivationCents;
    if (line.listRecurringCents !== undefined) {
      const offerRecurringCents = line.offerRecurringCents ?? 0;
      if (line.plan.type === PlanType.OneTime) {
        totals.listOneOffCents += line.listRecurringCents;
        totals.offerOneOffCents += offerRecurringCents;
      } else {
        const months = line.plan.billingInterval === 'ANNUAL' ? 12 : 1;
        totals.listMonthlyCents += line.listRecurringCents / months;
        totals.offerMonthlyCents += offerRecurringCents / months;
      }
    }
    return totals;
  }, { listOneOffCents: 0, offerOneOffCents: 0, listMonthlyCents: 0, offerMonthlyCents: 0 }));

  /** Whether some discount is granted on the priced lines or on the quoted customizations. */
  readonly hasDiscounts = computed(() =>
    this.pricedLines().some(line => line.activationDiscountPercent > 0 || line.recurringDiscountPercent > 0)
      || this.customizationRows().some(row => row.status === CustomizationStatus.Quoted && (row.stored?.discountPercent ?? 0) > 0));

  /** Whether some priced line carries a separately-priced assistance. */
  readonly hasAssistance = computed(() => this.pricedLines().some(line => line.plan.assistance));

  /** Ordered form sections of the sidebar; a disabled one carries the reason in its tooltip. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'info', label: 'Informazioni', icon: 'lucideInfo' },
    { id: 'lines', label: 'Righe', icon: 'lucideList' },
    { id: 'customization', label: 'Personalizzazioni', icon: 'lucidePuzzle' },
    { id: 'conditions', label: 'Condizioni economiche', icon: 'lucideChartLine', noFields: true },
    { id: 'offer', label: 'Offerta', icon: 'lucideFileText', disabled: this.offerHint() !== null, hint: this.offerHint() ?? undefined, noFields: true },
  ]);

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.orderForm);

  /** Every status the form emits, the same one again included, so that a section completes even while the form stays invalid. */
  private readonly _formStatus = toSignal(this.orderForm.statusChanges, { initialValue: this.orderForm.status, equal: () => false });

  /** Navigation through the sections, one after the other while creating, each once its required fields are filled. */
  readonly steps = formSteps(this.tabs, this.creating, id => this._isSectionComplete(id));

  /** Signal to track the upload of the files. */
  isUploading = signal<boolean>(false);

  /** Companies whose seller to resolve, one per company chosen. */
  private readonly _sellerCompanyId$ = new Subject<string | null | undefined>();

  /** Plans read so far, by audience and product. */
  private readonly _plansByProduct = signal<Record<string, CoreResponsePlanDto[]>>({});

  /** Code of the reseller whose workspace is open, to offer its companies only. */
  private readonly _workspaceResellerCode = toSignal(
    toObservable(this._context.resellerId).pipe(
      switchMap(resellerId => resellerId
        ? this._resellersApiService.getReseller(resellerId).pipe(map(reseller => reseller.code))
        : of(null)),
    ),
    { initialValue: null },
  );

  /** Channel of the order: from the seller while editing, from the order itself when read-only. */
  readonly channel = computed(() =>
    this.seller()?.channel ?? (this.order()?.channel as SalesChannel | undefined) ?? SalesChannel.Direct);

  /** Audience of the plans the lines can pick, from the channel. */
  readonly planAudience = computed(() => this.channel() === SalesChannel.Reseller ? PlanAudience.Reseller : PlanAudience.Company);

  /** Products that can be sold on the channel of the order. */
  readonly orderableProducts = computed(() => {
    const enabled = this.seller()?.productIds;
    return this._productsCacheService.products()
      .filter(product => product.orderable !== false && (!enabled || enabled.includes(product.id)));
  });

  /** Every product, for the names of the lines already on the order. */
  products = this._productsCacheService.products;

  /** Whether some line has no customization yet. */
  readonly canCustomizeLine = computed(() => this.customizableProductsFor(-1).length > 0);

  /** Emits the action chosen on a customization. */
  customizationAction = output<{ action: CustomizationAction; customization: CoreResponseOrderCustomizationDto }>();

  /** Emits a line left behind to complete: its tenant and users confirmed, the line not provisioned. */
  completeLine = output<CoreResponseOrderLineDto>();

  /** Getter for the line controls as an array of FormGroups. */
  get linesControls(): FormGroup<OrderLineForm>[] {
    return this.orderForm.controls.lines.controls;
  }

  /** Getter for the customization controls as an array of FormGroups. */
  get customizationsControls(): FormGroup<OrderCustomizationForm>[] {
    return this.orderForm.controls.customizations.controls;
  }

  /**
   * Constructor of the form component.
   */
  constructor() {
    // Resolve the seller of the company, keeping only the answer for the last one chosen.
    this._sellerCompanyId$.pipe(
      switchMap(companyId => companyId
        ? this._ordersApiService.getSeller(companyId).pipe(
          map(seller => ({ seller, failed: false })),
          catchError(() => of({ seller: null, failed: true })),
        )
        : of({ seller: null, failed: false })),
      takeUntilDestroyed(),
    ).subscribe(({ seller, failed }) => {
      this.seller.set(seller);
      this.sellerFailed.set(failed);
      if (failed) this._toasterService.showError('Impossibile leggere il canale di vendita dell\'azienda. Riprova prima di modificare le righe.');
      this.orderForm.controls.lines.updateValueAndValidity();
      this._applyAllDiscountValidators();
    });

    // Read the plans of the lines again for the audience of a channel resolved after them.
    effect(() => {
      this.planAudience();
      untracked(() => this.linesControls.forEach(line => {
        if (line.controls.productId.value) this._loadPlans(line.controls.productId.value);
      }));
    });

    // Populate the form from the order to edit; the company is fixed once the order exists.
    effect(() => {
      const order = this.order();
      if (!order) return;
      untracked(() => this._populate(order));
    });

    // Reset the selection when the delete dialog closes.
    effect(() => {
      if (this.dialogContent()?.state() === 'closed') {
        this.closeDeleteDialog();
      }
    });

    // Follow the read-only mode both ways: the detail starts read-only until the order is loaded.
    // No events, so that enabling the company does not start the lines over.
    effect(() => {
      const order = this.order();
      const evaluating = this.evaluating();
      if (this.readonly()) {
        this.orderForm.disable({ emitEvent: false });
        untracked(() => this._applyEvaluationMode(evaluating));
        return;
      }
      this.orderForm.enable({ emitEvent: false });
      untracked(() => this._applyEvaluationMode(false));
      if (!order) return;
      this.orderForm.controls.companyId.disable({ emitEvent: false });
      // The seller only caps the lines being edited, and only the sellers may read it.
      untracked(() => this._resolveSeller(order.companyId));
    });

    // Resolve the seller from the chosen company and start the lines over, since products and plans depend on it.
    this.orderForm.controls.companyId.valueChanges.pipe(takeUntilDestroyed()).subscribe(companyId => {
      if (this.orderForm.controls.companyId.disabled) return;
      this.orderForm.controls.lines.clear();
      this._resolveSeller(companyId);
    });
  }

  /**
   * Adds an empty line.
   */
  addLine(): void {
    // Dirty before the change, so that formChanges takes it as a change and not as the loaded value.
    this.orderForm.controls.lines.markAsDirty();
    this.orderForm.controls.lines.push(this._createLine());
  }

  /**
   * Adds an empty customization on a line of the order.
   * @param kind what the customization is attached to.
   */
  addCustomization(kind: CustomizationKind): void {
    this.orderForm.controls.customizations.markAsDirty();
    this.orderForm.controls.customizations.push(this._createCustomization({ kind }));
  }

  /**
   * Opens the quotation dialog of a saved customization, keeping its outcome to restore it on cancel.
   * Quoting and refusing set the outcome, so the dialog shows only its fields.
   * @param index the index of the customization.
   * @param mode to quote, to refuse, or to change the outcome already given.
   */
  openEvaluationDialog(index: number, mode: EvaluationMode): void {
    const evaluation = this.customizationsControls[index].controls.evaluation;
    this.quoting.set({ index, mode, snapshot: evaluation.getRawValue(), pristine: evaluation.pristine });

    if (mode !== 'edit') {
      evaluation.controls.outcome.setValue(mode === 'quote' ? CustomizationStatus.Quoted : CustomizationStatus.Refused);
      evaluation.markAsDirty();
    }
    this.evaluationDialog()?.open();
  }

  /**
   * Keeps the outcome given in the dialog, to be saved with the others by «Salva quotazione».
   */
  confirmEvaluation(): void {
    const quote = this.quoting();
    if (!quote || this.customizationsControls[quote.index].controls.evaluation.invalid) return;

    this.quoting.set(null);
    this.evaluationDialog()?.close();
  }

  /**
   * Closes the quotation dialog and brings the outcome back to what it was on opening.
   */
  cancelEvaluation(): void {
    this._restoreEvaluation();
    this.evaluationDialog()?.close();
  }

  /**
   * Handles the quotation dialog closed by Esc or a click outside, which cancels as «Annulla» does.
   */
  onEvaluationDialogClosed(): void {
    this._restoreEvaluation();
  }

  /**
   * Opens the delete dialog for a line or a customization.
   * @param target what to delete.
   * @param index the index of the line or of the customization.
   */
  openDeleteDialog(target: 'line' | 'customization', index: number): void {
    this.pendingDeletion = { target, index };
    this.dialog()?.open();
  }

  /**
   * Closes the delete dialog and resets the selection.
   */
  closeDeleteDialog(): void {
    this.pendingDeletion = null;
    this.dialog()?.close();
  }

  /**
   * Deletes the selected line, with its customization, or the selected customization.
   */
  confirmDeletion(): void {
    const deletion = this.pendingDeletion;
    if (!deletion) return;
    const { lines, customizations } = this.orderForm.controls;
    lines.markAsDirty();
    customizations.markAsDirty();

    if (deletion.target === 'line') {
      const productId = this.linesControls[deletion.index].controls.productId.value;
      lines.removeAt(deletion.index);
      const customization = this._customizationIndexOf(productId);
      if (customization >= 0) customizations.removeAt(customization);
    } else {
      customizations.removeAt(deletion.index);
    }
    this.closeDeleteDialog();
  }

  /**
   * Tells whether a line carries a customization, to warn before deleting it.
   * @param index the index of the line.
   * @returns true when the line has its customization.
   */
  lineHasCustomization(index: number): boolean {
    return this._customizationIndexOf(this.linesControls[index]?.controls.productId.value ?? null) >= 0;
  }

  /**
   * Returns the products a line can pick: the orderable ones not already on another line.
   * @param index the index of the line.
   * @returns the products.
   */
  productsFor(index: number): { id: string; name: string }[] {
    const taken = this.linesControls
      .filter((_, other) => other !== index)
      .map(line => line.controls.productId.value);
    return this.orderableProducts().filter(product => !taken.includes(product.id));
  }

  /**
   * Returns the plans a line can pick: active plans of its product, meant for the channel.
   * @param productId the product of the line.
   * @returns the plans.
   */
  plansFor(productId: string | null): CoreResponsePlanDto[] {
    if (!productId) return [];

    return this._plansByProduct()[this._plansKey(productId, this.planAudience())] ?? [];
  }

  /**
   * Tells whether the plan of a line is priced by seats: only volume plans are.
   * @param productId the product of the line.
   * @param planId the plan of the line.
   * @returns true when the line needs its seats.
   */
  hasSeats(productId: string | null, planId: string | null): boolean {
    return this.plansFor(productId).find(plan => plan.id === planId)?.type === PlanType.TieredVolume;
  }

  /**
   * Returns the highest discount of a component: the margin of the reseller contract on the indirect channel.
   * A margin the requester may not see leaves the cap to the server, which enforces it anyway.
   * @param component the priced component.
   * @returns the maximum discount, in percent.
   */
  maxDiscount(component: 'activation' | 'recurring'): number {
    const margin = this.seller()?.margin;
    if (this.channel() !== SalesChannel.Reseller || !margin) return 100;
    return component === 'activation' ? margin.activationPercent : margin.recurringPercent;
  }

  /**
   * Adds the Italian VAT to a net amount.
   * @param cents the net amount in cents.
   * @returns the amount with VAT, in cents.
   */
  withVat(cents: number): number {
    return Math.round(cents * (1 + this._ivaRate));
  }

  /**
   * Returns the products of the lines a customization can pick: those without another customization.
   * @param index the index of the customization, or -1 for a new one.
   * @returns the identifiers of the products.
   */
  customizableProductsFor(index: number): string[] {
    const { lines, customizations } = this._formValue();
    const taken = customizations
      .filter((customization, other) => other !== index && customization.kind === CustomizationKind.Product)
      .map(customization => customization.productId);
    return lines.map(line => line.productId).filter((productId): productId is string => !!productId && !taken.includes(productId));
  }

  /**
   * Names a customization by what it is attached to.
   * @param kind what the customization is attached to.
   * @param productId the product of its line.
   * @returns the product name.
   */
  customizationLabel(kind: CustomizationKind, productId: string | null): string {
    return (productId && this.productLabel(productId)) || 'Personalizzazione';
  }

  /**
   * Finds the customization a form group stands for, as the backend stored it.
   * @param group the customization group.
   * @returns the stored customization, or undefined until saved.
   */
  storedCustomization(group: FormGroup<OrderCustomizationForm>): CoreResponseOrderCustomizationDto | undefined {
    const id = group.controls.id.value;
    return id ? this.order()?.customizations?.find(customization => customization.id === id) : undefined;
  }

  /**
   * Takes the files chosen with the button for a customization.
   * @param event the input change event.
   * @param group the customization group.
   */
  onFilesChosen(event: Event, group: FormGroup<OrderCustomizationForm>): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.onFilesSelected(files, group);
  }

  /**
   * Keeps the PDFs and audio files chosen or dropped for a customization, to upload them on save.
   * @param files the files.
   * @param group the customization group.
   */
  onFilesSelected(files: File[], group: FormGroup<OrderCustomizationForm>): void {
    const chosen = files.flatMap<CustomizationFileValue>(file => {
      if (file.type === 'application/pdf') return [{ name: file.name, type: 'PDF', file }];
      if (file.type.startsWith('audio/')) return [{ name: file.name, type: 'AUDIO', file }];
      return [];
    });
    if (chosen.length < files.length) this._toasterService.showError('Si possono allegare solo PDF e file audio.');
    if (!chosen.length) return;
    group.controls.attachments.markAsDirty();
    group.controls.attachments.setValue([...group.controls.attachments.value, ...chosen]);
  }

  /**
   * Takes a file off a customization; an uploaded one leaves the order on save.
   * @param group the customization group.
   * @param index the index of the file.
   */
  removeAttachment(group: FormGroup<OrderCustomizationForm>, index: number): void {
    group.controls.attachments.markAsDirty();
    group.controls.attachments.setValue(group.controls.attachments.value.filter((_, other) => other !== index));
  }

  /**
   * Opens an uploaded file of a customization in a new tab.
   * @param file the file.
   */
  downloadAttachment(file: CustomizationFileValue): void {
    if (!file.s3Key) return;
    this._s3UploadService.getDownloadUrl(customizationFileEntity(file.type), file.s3Key).subscribe(url => openInNewTab(url));
  }

  /**
   * Returns the files chosen for the customizations and not uploaded yet.
   * @returns the files, each with its kind.
   */
  pendingFiles(): (CustomizationFileValue & { file: File })[] {
    return this.customizationsControls.flatMap(group => group.controls.attachments.value
      .filter((file): file is CustomizationFileValue & { file: File } => !!file.file));
  }

  /**
   * Sets the upload state of the files.
   * @param uploading whether uploading is in progress.
   */
  setUploadingState(uploading: boolean): void {
    this.isUploading.set(uploading);
  }

  /**
   * Returns the lines as the backend receives them.
   * @returns the lines.
   */
  linesValue(): CoreOrderLineInput[] {
    return this.linesControls.map(line => {
      const value = line.getRawValue();
      return {
        productId: value.productId!,
        activationDiscountPercent: value.activationDiscountPercent ?? 0,
        recurringDiscountPercent: value.recurringDiscountPercent ?? 0,
        ...(value.planId ? { planId: value.planId } : {}),
        ...(value.seats ? { seats: value.seats } : {}),
      };
    });
  }

  /**
   * Returns the customization requests as the backend receives them, the ones already saved with their identifier.
   * @param uploadedKeys the S3 keys of the files just uploaded, by file.
   * @returns the requests.
   */
  customizationsValue(uploadedKeys: Map<File, string> = new Map()): CoreCustomizationInput[] {
    return this.customizationsControls.map(group => {
      const value = group.getRawValue();
      const attachments = value.attachments.flatMap(file => {
        const s3Key = file.s3Key ?? (file.file && uploadedKeys.get(file.file));
        return s3Key ? [{ s3Key, type: file.type, name: file.name }] : [];
      });
      return {
        kind: value.kind,
        ...(value.id ? { id: value.id } : {}),
        ...(value.kind === CustomizationKind.Product && value.productId ? { productId: value.productId } : {}),
        ...(value.description?.trim() ? { description: value.description.trim() } : {}),
        ...(attachments.length ? { attachments } : {}),
      };
    });
  }

  /**
   * Tells whether the back office changed an outcome since the order was loaded.
   * @returns true when the quotation has changes to save.
   */
  evaluationDirty(): boolean {
    return this.customizationsControls.some(group => group.controls.evaluation.dirty);
  }

  /**
   * Returns the outcome of every customization as the backend receives it, once each one has a complete outcome.
   * @returns the outcomes, or null while one is missing or incomplete.
   */
  evaluationsValue(): CoreCustomizationEvaluation[] | null {
    const groups = this.customizationsControls.filter(group => group.controls.id.value);
    if (groups.length === 0 || groups.some(group => group.controls.evaluation.invalid)) return null;
    return groups.map(group => {
      const { outcome, oneOffAmount, recurringIncreaseAmount, refusalReason } = group.controls.evaluation.getRawValue();
      return outcome === CustomizationStatus.Refused
        ? { customizationId: group.controls.id.value!, refusalReason: refusalReason!.trim() }
        : {
          customizationId: group.controls.id.value!,
          ...(oneOffAmount ? { listOneOffCents: Math.round(oneOffAmount * 100) } : {}),
          ...(recurringIncreaseAmount ? { listRecurringIncreaseCents: Math.round(recurringIncreaseAmount * 100) } : {}),
        };
    });
  }

  /**
   * Tells whether the provisioning of a line is under way: its tenant was asked of the product and the line waits for
   * the product to confirm tenant and users, so it cannot be provisioned again.
   * @param line the order line.
   * @returns true while the product works on the line.
   */
  isProvisioning(line: CoreResponseOrderLineDto): boolean {
    return line.status === OrderLineStatus.ToBeProvisioned && !!line.tenantId && line.tenantStatus !== TenantStatus.Cancelled;
  }

  /** Whether a section has something left to complete, for the sidebar. */
  readonly needsAttentionFn = (tabId: string): boolean => this.needsAttention(tabId);

  /**
   * Tells whether a step holds work for the user: lines to provision or to complete for the back office, or
   * customizations still without an outcome while it prices the order.
   * @param tabId the id of the step.
   * @returns true when the step needs the user.
   */
  needsAttention(tabId: string): boolean {
    if (tabId === 'lines') {
      return this.canProvision() && (this.order()?.lines ?? [])
        .some(line => line.status === OrderLineStatus.ToBeProvisioned && (!this.isProvisioning(line) || this.isLeftBehind(line)));
    }
    if (tabId === 'customization') {
      return this.evaluating() && this.customizationsControls.some(group => !!group.controls.id.value && group.controls.evaluation.invalid);
    }
    return false;
  }

  /**
   * Tells whether a line was left behind: the product confirmed its tenant and every user, but the line is not
   * provisioned, as when a step stopped halfway.
   * @param line the order line.
   * @returns true when the line can be completed by hand.
   */
  isLeftBehind(line: CoreResponseOrderLineDto): boolean {
    return line.status === OrderLineStatus.ToBeProvisioned && line.tenantStatus === TenantStatus.Active && !line.tenantPendingUsers;
  }

  /**
   * Finds the line of the order for a product, with its provisioning status and tenant.
   * @param productId the product of the line.
   * @returns the line, or undefined when the order has none for the product.
   */
  orderLineOf(productId: string | null): CoreResponseOrderLineDto | undefined {
    return this.order()?.lines?.find(line => line.productId === productId);
  }

  /**
   * Fills the form with an order, rebuilding its lines.
   * @param order the order to edit.
   */
  private _populate(order: CoreResponseOrderDto): void {
    this.orderForm.controls.companyId.disable();
    this.orderForm.reset({ code: order.code, companyId: order.companyId });
    this.companies.remember({ value: order.companyId, label: this._companyLabelOf(order.companyName, order.companyVatNumber) });
    this.orderForm.setControl('lines', new FormArray((order.lines ?? []).map(line => this._createLine({
      productId: line.productId,
      planId: line.planId ?? null,
      seats: line.seats ?? null,
      activationDiscountPercent: line.activationDiscountPercent,
      recurringDiscountPercent: line.recurringDiscountPercent,
    }))));
    this.orderForm.setControl('customizations', new FormArray((order.customizations ?? []).map(customization => this._createCustomization({
      id: customization.id,
      kind: customization.kind as CustomizationKind,
      productId: customization.productId,
      description: customization.description,
      attachments: customization.attachments,
      evaluation: customization,
    }))));
    this._applyEvaluationMode(this.readonly() && this.evaluating());
    (order.lines ?? []).forEach(line => this._loadPlans(line.productId));
    if (this.readonly()) {
      this.orderForm.disable({ emitEvent: false });
    }
  }

  /**
   * Builds a line group and follows its product, to offer its plans.
   * @param value the initial value of the line.
   * @returns the line group.
   */
  private _createLine(value?: Partial<{ [K in keyof OrderLineForm]: OrderLineForm[K]['value'] }>): FormGroup<OrderLineForm> {
    const line = new FormGroup<OrderLineForm>({
      productId: new FormControl<string | null>(value?.productId ?? null, [Validators.required]),
      planId: new FormControl<string | null>(value?.planId ?? null),
      seats: new FormControl<number | null>(value?.seats ?? null, [Validators.min(1)]),
      activationDiscountPercent: new FormControl<number | null>(value?.activationDiscountPercent ?? 0),
      recurringDiscountPercent: new FormControl<number | null>(value?.recurringDiscountPercent ?? 0),
    });
    this._applyDiscountValidators(line);

    // React only to a real change: enabling or disabling the form re-emits the same value. The customization follows its line.
    line.controls.productId.valueChanges.pipe(startWith(line.controls.productId.value), distinctUntilChanged(), pairwise(), takeUntilDestroyed(this._destroyRef))
      .subscribe(([previous, productId]) => {
        line.controls.planId.setValue(null);
        if (productId) this._loadPlans(productId);
        const customization = this.customizationsControls[this._customizationIndexOf(previous)];
        customization?.controls.productId.setValue(productId);
      });

    // Seats count only on the plans priced by seats.
    line.controls.planId.valueChanges.pipe(startWith(line.controls.planId.value), distinctUntilChanged(), skip(1), takeUntilDestroyed(this._destroyRef))
      .subscribe(planId => {
        if (!this.hasSeats(line.controls.productId.value, planId)) line.controls.seats.setValue(null);
      });
    return line;
  }

  /**
   * Reads the active plans of a product for the audience of the channel, once.
   * @param productId the identifier of the product.
   */
  private _loadPlans(productId: string): void {
    const audience = this.planAudience();
    const key = this._plansKey(productId, audience);
    if (this._plansByProduct()[key]) return;

    // The plan selector needs every active plan of the product: the pages are read to the last one.
    const readPage = (cursor?: string) =>
      this._plansApiService.listPlans({ limit: PLANS_PAGE_SIZE, cursor }, { productId, audience, status: [PlanStatus.Active] });
    readPage().pipe(
      expand(page => page.nextCursor ? readPage(page.nextCursor) : EMPTY),
      reduce((plans, page) => [...plans, ...page.items], [] as CoreResponsePlanDto[]),
    ).subscribe(plans => this._plansByProduct.update(current => ({ ...current, [key]: plans })));
  }

  /**
   * Builds the key the plans of a product are kept under, one list per audience.
   * @param productId the identifier of the product.
   * @param audience the audience of the plans.
   * @returns the key.
   */
  private _plansKey(productId: string, audience: PlanAudience): string {
    return `${audience}#${productId}`;
  }

  /**
   * Reads who sells to a company: its reseller's products and margin cap the lines.
   * @param companyId the identifier of the company, absent before one is chosen.
   */
  private _resolveSeller(companyId: string | null | undefined): void {
    this._sellerCompanyId$.next(companyId);
  }


  /**
   * Caps the discounts of every line.
   */
  private _applyAllDiscountValidators(): void {
    this.linesControls.forEach(line => this._applyDiscountValidators(line));
  }

  /**
   * Caps the discounts of a line at the reseller margin, or at 100 on the direct channel.
   * @param line the line.
   */
  private _applyDiscountValidators(line: FormGroup<OrderLineForm>): void {
    const { activationDiscountPercent, recurringDiscountPercent } = line.controls;
    activationDiscountPercent.setValidators([Validators.min(0), Validators.max(this.maxDiscount('activation'))]);
    recurringDiscountPercent.setValidators([Validators.min(0), Validators.max(this.maxDiscount('recurring'))]);
    activationDiscountPercent.updateValueAndValidity();
    recurringDiscountPercent.updateValueAndValidity();
  }

  /**
   * Builds a customization group, which needs a description, some files or both.
   * @param value the initial value of the customization.
   * @returns the customization group.
   */
  private _createCustomization(value: {
    id?: string;
    kind: CustomizationKind;
    productId?: string;
    description?: string;
    attachments?: CustomizationFileValue[];
    evaluation?: CoreResponseOrderCustomizationDto;
  }): FormGroup<OrderCustomizationForm> {
    return new FormGroup<OrderCustomizationForm>({
      id: new FormControl<string | null>(value.id ?? null),
      kind: new FormControl<CustomizationKind>(value.kind, { nonNullable: true }),
      productId: new FormControl<string | null>(value.productId ?? null, value.kind === CustomizationKind.Product ? [Validators.required] : []),
      description: new FormControl<string | null>(value.description ?? null),
      attachments: new FormControl<CustomizationFileValue[]>(value.attachments ?? [], { nonNullable: true }),
      evaluation: this._createEvaluation(value.evaluation),
    }, {
      validators: [(group: AbstractControl) => {
        const { description, attachments } = (group as FormGroup<OrderCustomizationForm>).getRawValue();
        return description?.trim() || attachments.length > 0 ? null : { empty: true };
      }],
    });
  }

  /**
   * Builds the outcome of a customization, from the one the back office already gave. It starts disabled: only the
   * evaluation mode enables it.
   * @param stored the customization as the backend stored it, when it exists.
   * @returns the outcome form group.
   */
  private _createEvaluation(stored?: CoreResponseOrderCustomizationDto): FormGroup<CustomizationEvaluationForm> {
    const outcome = stored?.status === CustomizationStatus.Quoted ? CustomizationStatus.Quoted
      : stored?.status === CustomizationStatus.Refused ? CustomizationStatus.Refused : null;
    const group = new FormGroup<CustomizationEvaluationForm>({
      outcome: new FormControl<CustomizationStatus.Quoted | CustomizationStatus.Refused | null>(outcome),
      oneOffAmount: new FormControl<number | null>(stored?.listOneOffCents != null ? stored.listOneOffCents / 100 : null),
      recurringIncreaseAmount: new FormControl<number | null>(stored?.listRecurringIncreaseCents != null ? stored.listRecurringIncreaseCents / 100 : null),
      refusalReason: new FormControl<string | null>(stored?.refusalReason ?? null),
    }, {
      validators: [(control: AbstractControl) => {
        const value = (control as FormGroup<CustomizationEvaluationForm>).getRawValue();
        if (value.outcome === CustomizationStatus.Quoted) {
          return (value.oneOffAmount ?? 0) > 0 || (value.recurringIncreaseAmount ?? 0) > 0 ? null : { amount: true };
        }
        if (value.outcome === CustomizationStatus.Refused) {
          return value.refusalReason?.trim() ? null : { reason: true };
        }
        return { outcome: true };
      }],
    });
    group.disable({ emitEvent: false });
    return group;
  }

  /**
   * Tells whether the required fields of a section are filled: the company, at least one valid line, valid customizations.
   * @param id the identifier of the section.
   * @returns whether the section is complete.
   */
  private _isSectionComplete(id: string): boolean {
    this._formStatus();
    const { companyId, lines, customizations } = this.orderForm.controls;

    switch (id) {
      case 'info':
        return companyId.valid;
      case 'lines':
        return lines.length > 0 && lines.valid;
      case 'customization':
        return customizations.valid && !this.orderForm.hasError('customizationProduct');
      default:
        return true;
    }
  }

  /**
   * Brings the outcome of the customization in the quotation dialog back to what it was on opening.
   */
  private _restoreEvaluation(): void {
    const quote = this.quoting();
    if (!quote) return;

    const evaluation = this.customizationsControls[quote.index]?.controls.evaluation;
    evaluation?.setValue(quote.snapshot);
    if (quote.pristine) evaluation?.markAsPristine();
    this.quoting.set(null);
  }

  /**
   * Enables the outcomes of the saved customizations only while the back office prices the order.
   * @param evaluating whether the back office is pricing the order.
   */
  private _applyEvaluationMode(evaluating: boolean): void {
    for (const group of this.customizationsControls) {
      const evaluation = group.controls.evaluation;
      if (evaluating && group.controls.id.value) {
        evaluation.enable({ emitEvent: false });
      } else {
        evaluation.disable({ emitEvent: false });
      }
    }
  }

  /**
   * Finds the customization of a line.
   * @param productId the product of the line.
   * @returns the index of the customization, or -1 when the line has none.
   */
  private _customizationIndexOf(productId: string | null): number {
    if (!productId) return -1;
    return this.customizationsControls.findIndex(group =>
      group.controls.kind.value === CustomizationKind.Product && group.controls.productId.value === productId);
  }

  /**
   * Asks for at least one line, each customization of a product on a line of the order.
   * @param form the order form.
   * @returns the error, or null when the order has something to supply.
   */
  private _contentValidator(form: AbstractControl): ValidationErrors | null {
    const value = (form as FormGroup<CreateEditOrderForm>).getRawValue();
    if (value.lines.length === 0) return { empty: true };
    const products = value.lines.map(line => line.productId);
    return value.customizations.every(customization => customization.kind !== CustomizationKind.Product || products.includes(customization.productId))
      ? null
      : { customizationProduct: true };
  }

  /**
   * Computes the list recurring amount of a plan for a number of seats, per billing interval.
   * @param plan the plan pricing the line.
   * @param seats the seats sold on the line.
   * @returns the amount in cents, or undefined when no tier covers the seats.
   */
  private _listRecurringCents(plan: CoreResponsePlanDto, seats: number): number | undefined {
    if (plan.type !== PlanType.TieredVolume) {
      return Math.round((plan.baseCost ?? 0) * 100);
    }
    const tier = this._tierOf(plan, seats);
    if (!tier) return undefined;
    const monthly = tier.price * seats + (plan.baseCost ?? 0);
    return Math.round((plan.billingInterval === 'ANNUAL' ? monthly * 12 : monthly) * 100);
  }

  /**
   * Finds the tier of a volume plan the seats fall into.
   * @param plan the plan.
   * @param seats the seats.
   * @returns the tier, or undefined when none covers the seats.
   */
  private _tierOf(plan: CoreResponsePlanDto, seats: number): CoreResponsePlanDto['tiers'][number] | undefined {
    return plan.tiers.find(candidate =>
      seats >= (candidate.minValue ?? 0) && seats <= (candidate.maxValue ?? Number.MAX_SAFE_INTEGER));
  }

  /**
   * Takes a percentage off an amount.
   * @param cents the amount in cents.
   * @param percent the percentage to take off.
   * @returns the reduced amount in cents.
   */
  private _applyPercent(cents: number, percent: number): number {
    return Math.round(cents * (100 - percent) / 100);
  }

  /**
   * Builds the label of a company: its legal name and, when known, its VAT number.
   * @param name the legal name.
   * @param vatNumber the VAT number, if any.
   * @returns the label.
   */
  private _companyLabelOf(name: string, vatNumber: string | undefined): string {
    return vatNumber ? `${name} · ${vatNumber}` : name;
  }
}
