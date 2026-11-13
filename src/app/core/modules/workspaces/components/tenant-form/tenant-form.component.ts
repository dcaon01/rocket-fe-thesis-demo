
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MultiSelectComponent } from '../../../../components/multi-select/multi-select.component';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink, lucideInfo, lucideLink2, lucideListTree, lucideHistory, lucideUserRound } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { CoreResponseTenantDto, CoreResponsePendingOperationDto, CoreStructureField } from '../../../../../../../libs/api/src';
import { ContractStatus } from '../../../../enums/contract-status.enum';
import { TrialStatus } from '../../../../enums/trial-status.enum';
import { TenantStatus } from '../../../../enums/tenant-status.enum';
import { TenantStatusPipe } from '../../../../pipes/tenant-status/tenant-status.pipe';
import { ProductsApiService } from '../../../../services/api-services/products/products-api.service';
import { TrialsApiService } from '../../../../services/api-services/trials/trials-api.service';
import { OrdersApiService } from '../../../../services/api-services/orders/orders-api.service';
import { ContractsApiService } from '../../../../services/api-services/contracts/contracts-api.service';
import { COMBOBOX_PAGE_SIZE, remoteOptions } from '../../../../utils/remote-options.util';
import { CreateEditTenantForm } from '../../interfaces/create-edit-tenant-form';
import { StructureDynamicFormService } from '../../services/structure-dynamic-form/structure-dynamic-form.service';
import { OperationHistoryComponent } from '../operation-history/operation-history.component';
import { StructureFieldsComponent } from '../structure-fields/structure-fields.component';
import { ProvisionUserForm } from '../../../orders/interfaces/provision-line-form.interface';
import { TenantOrigin } from '../../enums/tenant-origin.enum';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { ON_PRODUCT_STATUSES } from '../../../../constants/provisioning-statuses';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { Capability } from '../../../../enums/capability.enum';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

@Component({
  selector: 'rocket-tenant-form',
  imports: [
    ...BrnComboboxImports,
    ...HlmComboboxImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    ...HlmTabsImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    NgTemplateOutlet,
    ReactiveFormsModule,
    TenantStatusPipe,
    OperationHistoryComponent,
    StructureFieldsComponent,
    ...HlmTooltipImports,
    NgIcon,
    ...HlmCardImports,
    StepListComponent,
    MultiSelectComponent,
  ],
  providers: [
    StructureDynamicFormService,
    provideIcons({
      lucideHistory,
      lucideExternalLink,
      lucideInfo,
      lucideLink2,
      lucideListTree,
      lucideUserRound
    })
  ],
  templateUrl: './tenant-form.component.html',
  styleUrl: './tenant-form.component.css'
})
export class TenantFormComponent {
  /** Activated route instance */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Products api service instance. */
  private readonly _productsApiService = inject(ProductsApiService);

  /** Trials api service instance. */
  private readonly _trialsApiService = inject(TrialsApiService);

  /** Orders api service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);

  /** Contracts api service instance. */
  private readonly _contractsApiService = inject(ContractsApiService);

  /** Structure dynamic form service instance. */
  private readonly _structureDynamicFormService = inject(StructureDynamicFormService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Tenant status pipe instance. */
  tenantData = input<CoreResponseTenantDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Operations sent to the product for the record, shown in its history. */
  operations = input<CoreResponsePendingOperationDto[]>([]);

  /** Whether the user can only read the tenant. */
  readonly = input<boolean>(false);

  /** Filter of the comboboxes. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Active trials not yet redeemed that a tenant can come from, searched by email. */
  readonly trials = remoteOptions(search =>
    this._trialsApiService.listTrials({ limit: COMBOBOX_PAGE_SIZE }, {
      productId: this._activatedRoute.snapshot.params['productId'],
      status: [TrialStatus.Active],
      search,
    }).pipe(
      map(page => page.items.filter(trial => !trial.redeemed).map(trial => ({ value: trial.id, label: trial.associatedEmail }))),
    ),
  );

  /** Converts a trial identifier to its label, used by the combobox for filtering and display. */
  readonly trialOptionLabel = (value: string): string => this.trials.labelOf(value) ?? '';

  /** Companies of the order lines read so far, by order, to name a tenant born from one. */
  private readonly _lineCompanies = new Map<string, string>();

  /** Order lines of the product waiting to be provisioned, with no tenant asked yet, searched by order code or company. */
  readonly lines = remoteOptions(search =>
    this._ordersApiService.listProvisioningQueue({ limit: COMBOBOX_PAGE_SIZE }, {
      productId: this._activatedRoute.snapshot.params['productId'],
      search,
    }).pipe(
      map(page => page.items.filter(line => !line.tenantId || line.tenantStatus === TenantStatus.Cancelled)),
      tap(lines => lines.forEach(line => this._lineCompanies.set(line.orderId, line.companyName))),
      map(lines => lines.map(line => ({ value: line.orderId, label: `${line.orderCode} · ${line.companyName}` }))),
    ),
  );

  /** Converts an order identifier to the label of its line, used by the combobox for filtering and display. */
  readonly lineOptionLabel = (value: string): string => this.lines.labelOf(value) ?? '';

  /** Where a tenant created by hand can come from, with their labels. */
  readonly tenantOrigins = [
    { value: TenantOrigin.Trial, label: 'Prova' },
    { value: TenantOrigin.OrderLine, label: "Riga d'ordine" },
  ];

  /** Statuses the operator can set: the others follow the product's answers. */
  readonly tenantStatus = [TenantStatus.Active, TenantStatus.Inactive];

  /** Whether the product has created the record: only then can the operator change it. */
  readonly isOnProduct = computed(() => ON_PRODUCT_STATUSES.includes(this.tenantData()?.status ?? ''));

  /** Whether the form can be edited (creation, or a tenant on the product); otherwise its values show as text. */
  readonly isEditable = computed(() => !this.readonly() && (!this.tenantData() || this.isOnProduct()));

  /** Whether the user works at Keus: the handover of an order line is its own. */
  readonly isKeus = computed(() => !this._permissions.isReseller());

  /** Whether the user can open the contract of the tenant, in the product workspace. */
  readonly canOpenContract = computed(() => this._permissions.can(Capability.ViewProductContracts));

  /** The product of the tenant. */
  readonly product = toSignal(this._productsApiService.getProduct(this._activatedRoute.snapshot.params['productId']), { initialValue: null });

  /** Tenant structure fields signal. */
  tenantStructure = computed(() => this.product()?.tenantStructure ?? []);

  /** Roles of the product, offered to the referent. */
  readonly roles = computed(() => this.product()?.roles ?? []);

  /** Status of the contract governing the tenant, once read; a newer tenant replaces a read still running. */
  readonly contractStatus = toSignal(
    toObservable(this.tenantData).pipe(
      switchMap(tenant => tenant?.contractId
        ? this._contractsApiService.getContract(tenant.productId, tenant.contractId).pipe(map(contract => contract.status), catchError(() => of(null)))
        : of(null)),
    ),
    { initialValue: null },
  );

  /** Signal indicating if the form is ready. */
  isFormReady = signal<boolean>(false);

  /** Ordered definition of the form sections shown in the sidebar navigation. */
  tabs = computed<StepTab[]>(() => {
    const list: StepTab[] = [
      { id: 'info', label: 'Informazioni di base', icon: 'lucideInfo' },
    ];
    if (this.isFormReady()) list.push({ id: 'structure', label: 'Struttura tenant', icon: 'lucideListTree' });
    if (!this.tenantData() && this.isOrderLine()) list.push({ id: 'referent', label: 'Referente', icon: 'lucideUserRound' });
    list.push({ id: 'history', label: 'Storico', icon: 'lucideHistory', disabled: !this.tenantData(), hint: 'Lo storico si vede dopo aver creato il tenant.', noFields: true });
    return list;
  });

  /** Form group for the visualized tenant. */
  tenantForm = new FormGroup<CreateEditTenantForm>({
    name: new FormControl<string | null>(null, [Validators.required]),
    description: new FormControl<string | null>(null),
    accountType: new FormControl<'CLIENT' | 'PROFESSIONAL' | null>('CLIENT'),
    status: new FormControl<string | null>(null),
    data: new FormGroup({}),
    contractCode: new FormControl<string | null>(null),
    origin: new FormControl<TenantOrigin>(TenantOrigin.Trial, { nonNullable: true }),
    trialId: new FormControl<string | null>(null),
    trialEmail: new FormControl<string | null>(null),
    orderId: new FormControl<string | null>(null),
    referent: new FormGroup<ProvisionUserForm>({
      email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
      name: new FormControl<string | null>(null),
      surname: new FormControl<string | null>(null),
      roles: new FormControl<string[]>([], { nonNullable: true }),
      data: new FormGroup({}),
    }),
  }, { validators: control => this._originRequiredOnCreation(control) });

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  /** Completion of the sections by their controls; the origin of a new tenant is checked on the whole form. */
  private readonly _sectionsComplete = sectionsComplete(this.tenantForm, {
    info: ['name', 'description', 'accountType', 'status', 'contractCode', 'origin', 'trialId', 'trialEmail', 'orderId'],
    structure: ['data'],
    referent: ['referent'],
  });

  readonly steps = formSteps(this.tabs, this.creating, id => this._isSectionComplete(id));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.tenantForm);

  /** Whether the tenant is created from an order line. */
  readonly isOrderLine = toSignal(this.tenantForm.controls.origin.valueChanges.pipe(map(origin => origin === TenantOrigin.OrderLine)), { initialValue: false });

  /** Whether the tenant can take a new order line: on the product, with no contract or a terminated one, by Keus. */
  readonly canTakeLine = computed(() => this.isEditable() && this.isKeus() && this.isOnProduct()
    && (!this.tenantData()?.contractId || this.contractStatus() === ContractStatus.Terminated));

  /**
   * Constructor of the component.
   */
  constructor() {
    // Build the referent's controls once the product's roles and user structure are known.
    effect(() => {
      const product = this.product();
      if (!product) return;
      const referent = this.tenantForm.controls.referent;
      referent.setControl('data', this._structureGroup(product.userStructure ?? []));
      referent.controls.roles.setValidators(product.roles?.length ? [Validators.required] : []);
      referent.controls.roles.updateValueAndValidity();
      untracked(() => this._applyReferentState());
    });

    // The referent counts only for a tenant born from an order line; the name starts from the line's company.
    effect(() => {
      this.isOrderLine();
      this.tenantData();
      untracked(() => this._applyReferentState());
    });
    this.tenantForm.controls.orderId.valueChanges.pipe(takeUntilDestroyed()).subscribe(orderId => {
      const company = orderId ? this._lineCompanies.get(orderId) : undefined;
      if (!this.tenantData() && company && !this.tenantForm.controls.name.value) {
        this.tenantForm.controls.name.setValue(company);
      }
    });

    // Effect for generating dynamic form controls based on tenant structure.
    effect(() => {
      const structureFields = this.tenantStructure();

      if (structureFields.length > 0) {
        this.isFormReady.set(false);
        const dynamicFormGroup = this._structureDynamicFormService.generateFormControls(structureFields);
        this.tenantForm.setControl('data', dynamicFormGroup);

        // In create mode, clear validators for generated fields (they are hidden).
        if (!this.tenantData()) {
          structureFields.forEach(field => {
            if (field.generated) {
              dynamicFormGroup.get(field.name)?.clearValidators();
              dynamicFormGroup.get(field.name)?.updateValueAndValidity();
            }
          });
        }

        // Mark the form as ready in the next microtask to ensure UI updates correctly.
        queueMicrotask(() => {
          this.isFormReady.set(true);
        });
      }
    });

    // Effect for populating the form with tenant data (edit mode).
    effect(() => {
      const tenant = this.tenantData();
      if (!tenant) return;

      const formattedData = StructureDynamicFormService.formatDataForForm(tenant.data || {}, this.tenantStructure());
      this.tenantForm.patchValue({
        name: tenant.name,
        description: tenant.description,
        accountType: tenant.accountType,
        status: tenant.status,
        data: formattedData,
      });

      // Show the contract born with the provisioning of the order line.
      if (tenant.contractId) {
        this.tenantForm.patchValue({ contractCode: tenant.contractCode ?? null });
        this.tenantForm.get('contractCode')?.disable();
      }

      // Handle trial association
      if (tenant.trialId) {
        this.tenantForm.patchValue({
          trialId: tenant.trialId,
          trialEmail: tenant.trialEmail,
        });
        this.tenantForm.get('trialEmail')?.disable();
        if (tenant.trialEmail) {
          this.trials.remember({ value: tenant.trialId, label: tenant.trialEmail });
        }
      }

      // Disable notModifiable fields in edit mode (skip OBJECT types, they use readonly in the template).
      const dataGroup = this.tenantForm.get('data') as FormGroup;
      this.tenantStructure().forEach(field => {
        if (field.notModifiable && field.type !== 'OBJECT') {
          dataGroup.get(field.name)?.disable();
        }
      });

      // A tenant the product has not created yet, or a user who only reads, can only look at it.
      if (!this.isOnProduct() || this.readonly()) {
        this.tenantForm.disable({ emitEvent: false });
      }
    });
  }

  /**
   * Navigates to the contract details page.
   */
  goToContract(): void {
    const contractId = this.tenantData()?.contractId;
    const productId = this._activatedRoute.snapshot.params['productId'];
    if (contractId && productId) {
      this._router.navigate([`/products/workspaces/${productId}/contracts`, contractId]);
    }
  }

  /**
   * Enables the referent only for a tenant created from an order line, so that it never blocks the other forms.
   */
  private _applyReferentState(): void {
    const referent = this.tenantForm.controls.referent;
    if (this.isOrderLine() && !this.tenantData()) {
      referent.enable({ emitEvent: false });
    } else {
      referent.disable({ emitEvent: false });
    }
    this.tenantForm.updateValueAndValidity();
  }

  /**
   * Tells whether the required fields of a section are filled; the information of a new tenant also needs its origin,
   * a trial or an order line, which the form checks as a whole.
   * @param id the identifier of the section.
   * @returns whether the section is complete.
   */
  private _isSectionComplete(id: string): boolean {
    return this._sectionsComplete(id) && (id !== 'info' || !this.tenantForm.hasError('originRequired'));
  }

  /**
   * Requires the origin of a tenant created by hand: a trial, or an order line with its referent.
   * @param control the form group to validate.
   * @returns the validation error when the origin is missing on creation.
   */
  private _originRequiredOnCreation(control: AbstractControl): ValidationErrors | null {
    if (this.tenantData()) return null;
    const field = control.get('origin')?.value === TenantOrigin.OrderLine ? 'orderId' : 'trialId';
    return control.get(field)?.value ? null : { originRequired: true };
  }

  /**
   * Builds the controls of a product structure; the generated fields are filled by the product, so they are not required.
   * @param structure the structure.
   * @returns the form group.
   */
  private _structureGroup(structure: CoreStructureField[]): FormGroup {
    const group = this._structureDynamicFormService.generateFormControls(structure);
    structure.filter(field => field.generated).forEach(field => {
      group.get(field.name)?.clearValidators();
      group.get(field.name)?.updateValueAndValidity();
    });
    return group;
  }
}
