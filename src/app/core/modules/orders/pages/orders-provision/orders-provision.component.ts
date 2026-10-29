import { Component, computed, inject, signal } from '@angular/core';
import { MultiSelectComponent } from '../../../../components/multi-select/multi-select.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideListTree, lucidePlus, lucideTrash2, lucideUser, lucideUsers } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, forkJoin, map, merge, Observable, of, switchMap } from 'rxjs';
import { CoreProvisionLineDto, CoreResponseCompanyDto, CoreResponseOrderDto, CoreResponseOrderLineDto, CoreResponseProductDto, CoreResponseTenantDto, CoreStructureField } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { OrderLineStatus } from '../../../../enums/order-line-status.enum';
import { TenantStatus } from '../../../../enums/tenant-status.enum';
import { CompaniesApiService } from '../../../../services/api-services/companies/companies-api.service';
import { OrdersApiService } from '../../../../services/api-services/orders/orders-api.service';
import { ProductsApiService } from '../../../../services/api-services/products/products-api.service';
import { TenantsApiService } from '../../../../services/api-services/tenants/tenants-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { StructureFieldsComponent } from '../../../workspaces/components/structure-fields/structure-fields.component';
import { StructureDynamicFormService } from '../../../workspaces/services/structure-dynamic-form/structure-dynamic-form.service';
import { COMBOBOX_PAGE_SIZE, remoteOptions } from '../../../../utils/remote-options.util';
import { TenantSource } from '../../enums/tenant-source.enum';
import { ProvisionLineForm, ProvisionUserForm } from '../../interfaces/provision-line-form.interface';
import { formSteps, StepTab } from '../../../../utils/form-steps.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

/** Users a line provisions at most, whatever its seats: the same limit as the backend. */
const MAX_PROVISIONED_USERS = 45;

/**
 * Provisioning of an order line: a new tenant on the product and its users, the first being the referent, or a tenant
 * the product already has, such as the one of a trial or of a terminated contract, which keeps its users.
 * The new tenant starts from the company's data where the names of the fields match.
 */
@Component({
  selector: 'rocket-orders-provision',
  imports: [
    ...BrnComboboxImports,
    ...BrnSelectImports,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmComboboxImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTabsImports,
    ...HlmTooltipImports,
    NgIcon,
    PageHeaderComponent,
    ReactiveFormsModule,
    StructureFieldsComponent,
    StepListComponent,
    FormToolbarComponent,
    MultiSelectComponent,
  ],
  providers: [
    StructureDynamicFormService,
    provideIcons({ lucideBuilding2, lucideListTree, lucidePlus, lucideTrash2, lucideUser, lucideUsers }),
  ],
  templateUrl: './orders-provision.component.html',
})
export class OrdersProvisionComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** The application context service instance: the global area or the workspace of a reseller. */
  private readonly _context = inject(AppContextService);

  /** Orders API service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);

  /** Products API service instance. */
  private readonly _productsApiService = inject(ProductsApiService);

  /** Companies API service instance. */
  private readonly _companiesApiService = inject(CompaniesApiService);

  /** Tenants API service instance. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** Builder of the controls of a product structure. */
  private readonly _structureDynamicFormService = inject(StructureDynamicFormService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Identifier of the order, from the route. */
  readonly orderId: string = this._activatedRoute.snapshot.params['orderId'];

  /** Product of the line, from the route. */
  readonly productId: string = this._activatedRoute.snapshot.params['productId'];

  /** The order of the line. */
  readonly order = signal<CoreResponseOrderDto | null>(null);

  /** The product of the line, with its roles and structures. */
  readonly product = signal<CoreResponseProductDto | null>(null);

  /** Tenant already requested for the line, if any. */
  readonly requestedTenant = signal<CoreResponseTenantDto | null>(null);

  /** Where the tenant of the line can come from, with their labels. */
  readonly tenantSources = [
    { value: TenantSource.New, label: 'Nuovo tenant' },
    { value: TenantSource.Existing, label: 'Tenant esistente' },
  ];

  /** Where the tenant of the line comes from. */
  readonly tenantSource = new FormControl<TenantSource>(TenantSource.New, { nonNullable: true });

  /** The existing tenant chosen for the line. */
  readonly existingTenantId = new FormControl<string | null>(null, [Validators.required]);

  /** Whether the line is provisioned on an existing tenant. */
  readonly isExisting = toSignal(this.tenantSource.valueChanges.pipe(map(source => source === TenantSource.Existing)), { initialValue: false });

  /** Tenants of the product the line can take: active, or inactive after a trial or a contract, searched by name. */
  readonly tenants = remoteOptions(search =>
    this._tenantsApiService.listTenants({ limit: COMBOBOX_PAGE_SIZE }, {
      productId: this.productId,
      status: [TenantStatus.Active, TenantStatus.Inactive],
      search,
    }).pipe(map(page => page.items.map(tenant => ({
      value: tenant.id,
      label: tenant.contractCode ? `${tenant.name} · ${tenant.contractCode}` : tenant.name,
    })))),
  );

  /** Converts a tenant identifier to its label, used by the combobox for filtering and display. */
  readonly tenantOptionLabel = (value: string): string => this.tenants.labelOf(value) ?? '';

  /** Whether the provisioning is being sent. */
  readonly isLoading = signal(false);

  /** The line being provisioned. */
  readonly line = computed(() => this.order()?.lines?.find(line => line.productId === this.productId) ?? null);

  /** Users the line can provision. */
  readonly maxUsers = computed(() => Math.min(this.line()?.seats ?? MAX_PROVISIONED_USERS, MAX_PROVISIONED_USERS));

  /** Roles of the product, offered to each user. */
  readonly roles = computed(() => this.product()?.roles ?? []);

  /** Tenant structure fields the operator fills in. */
  readonly tenantFields = computed(() => (this.product()?.tenantStructure ?? []).filter(field => !field.generated));

  /** Why the line cannot be provisioned, or null when it can. */
  readonly blockedReason = computed(() => {
    const line = this.line();
    if (!line) return null;
    if (line.status !== OrderLineStatus.ToBeProvisioned) return 'La riga è già stata erogata.';
    const tenant = this.requestedTenant();
    if (tenant && tenant.status !== TenantStatus.Cancelled) return 'Il tenant della riga è già stato chiesto al prodotto.';
    return null;
  });

  /** Subtitle of the page: the order and the company, or why the line cannot be provisioned. */
  readonly description = computed(() => {
    const order = this.order();
    if (!order) return '';
    const blocked = this.blockedReason();
    if (blocked) return blocked;
    return this.isExisting()
      ? `Eroga la riga dell'ordine ${order.code} di ${order.companyName} sul tenant esistente, con i suoi utenti e dati.`
      : `Eroga la riga dell'ordine ${order.code} di ${order.companyName}.`;
  });

  /** Steps of the form. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'tenant', label: 'Tenant', icon: 'lucideBuilding2' },
    ...(this.isExisting() ? [] : [
      ...(this.tenantFields().length > 0 ? [{ id: 'tenantData', label: 'Dati del tenant', icon: 'lucideListTree' }] : []),
      { id: 'users', label: 'Utenti', icon: 'lucideUsers' },
    ]),
  ]);


  /** Filter used by the roles combobox to match the typed text. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** The provisioning form. */
  readonly provisionForm = new FormGroup<ProvisionLineForm>({
    tenant: new FormGroup({
      name: new FormControl<string | null>(null, [Validators.required]),
      description: new FormControl<string | null>(null),
      data: new FormGroup({}),
    }),
    users: new FormArray<FormGroup<ProvisionUserForm>>([]),
  });

  /** Every status the form and the existing tenant emit, the same one again included, so that a section completes while the rest stays invalid. */
  private readonly _formStatus = toSignal(merge(this.provisionForm.statusChanges, this.existingTenantId.statusChanges), { initialValue: null, equal: () => false });

  /** Navigation through the sections, one after the other, each once its required fields are valid. */
  readonly steps = formSteps(this.tabs, computed(() => true), id => this._isSectionComplete(id));

  /** Number of users in the form, kept as a signal for the template. */
  readonly usersCount = signal(0);

  /**
   * Constructor of the component: loads the order, the product, the company and the tenant already requested.
   */
  constructor() {
    forkJoin({
      order: this._ordersApiService.getOrder(this.orderId),
      product: this._productsApiService.getProduct(this.productId),
    }).pipe(
      switchMap(({ order, product }) => {
        const line = order.lines?.find(item => item.productId === this.productId);
        return forkJoin({
          order: of(order),
          product: of(product),
          company: this._companiesApiService.getCompany(order.companyId),
          tenant: line?.tenantId ? this._tenantsApiService.getTenant(this.productId, line.tenantId) : of(null),
        });
      }),
    ).subscribe(({ order, product, company, tenant }) => {
      this.order.set(order);
      this.product.set(product);
      this.requestedTenant.set(tenant);
      this._buildTenant(company, product.tenantStructure);
      this.addUser();
    });
  }

  /** The user groups of the form. */
  get userGroups(): FormGroup<ProvisionUserForm>[] {
    return this.provisionForm.controls.users.controls;
  }

  /** Whether the part of the form for the chosen tenant is incomplete. */
  get isFormInvalid(): boolean {
    return this.isExisting() ? this.existingTenantId.invalid : this.provisionForm.invalid;
  }

  /**
   * Tells whether the required fields of a section are filled: the tenant chosen or named, its data, its users.
   * @param id the identifier of the section.
   * @returns whether the section is complete.
   */
  private _isSectionComplete(id: string): boolean {
    this._formStatus();
    const { tenant, users } = this.provisionForm.controls;

    switch (id) {
      case 'tenant':
        return this.isExisting() ? !this.existingTenantId.invalid : !tenant.controls.name.invalid;
      case 'tenantData':
        return !tenant.controls.data.invalid;
      case 'users':
        return !users.invalid;
      default:
        return true;
    }
  }

  /**
   * Adds a user to the form, up to the users the line can provision.
   */
  addUser(): void {
    const users = this.provisionForm.controls.users;
    if (users.length >= this.maxUsers()) return;
    users.push(new FormGroup<ProvisionUserForm>({
      email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
      name: new FormControl<string | null>(null),
      surname: new FormControl<string | null>(null),
      roles: new FormControl<string[]>([], { nonNullable: true, validators: this.roles().length > 0 ? [Validators.required] : [] }),
      data: this._structureGroup(this.product()?.userStructure ?? []),
    }));
    this.usersCount.set(users.length);
  }

  /**
   * Removes a user from the form; the referent stays.
   * @param index the position of the user.
   */
  removeUser(index: number): void {
    if (index === 0) return;
    this.provisionForm.controls.users.removeAt(index);
    this.usersCount.set(this.provisionForm.controls.users.length);
  }

  /**
   * Sends the provisioning: on an existing tenant the line is provisioned at once; otherwise the tenant is asked to
   * the product, and the users follow its confirmation.
   */
  provision(): void {
    const product = this.product();
    if (!product || this.isFormInvalid || this.blockedReason()) return;

    if (this.isExisting()) {
      this._send(
        this._ordersApiService.provisionLineOnTenant(this.orderId, this.productId, this.existingTenantId.value!),
        'Riga erogata sul tenant esistente: il referente riaccetta il contratto al primo accesso.',
      );
      return;
    }

    const { tenant, users } = this.provisionForm.getRawValue();
    const provision: CoreProvisionLineDto = {
      tenant: {
        name: tenant.name!,
        ...(tenant.description && { description: tenant.description }),
        data: this._parseData(tenant.data, product.tenantStructure),
      },
      users: users.map(user => ({
        email: user.email!,
        roles: user.roles,
        ...(user.name && { name: user.name }),
        ...(user.surname && { surname: user.surname }),
        data: this._parseData(user.data, product.userStructure),
      })),
    };

    this._send(
      this._ordersApiService.provisionLine(this.orderId, this.productId, provision),
      'Erogazione avviata: tenant e utenti aspettano la conferma del prodotto.',
    );
  }

  /**
   * Sends a provisioning request, then goes back to the order.
   * @param request the provisioning request.
   * @param message the message shown once it is accepted.
   */
  private _send(request: Observable<CoreResponseOrderLineDto>, message: string): void {
    this.isLoading.set(true);
    request.pipe(finalize(() => this.isLoading.set(false))).subscribe(() => {
      this._toasterService.showSuccess(message);
      this._router.navigate([`${this._context.basePath()}/orders`, this.orderId]);
    });
  }

  /**
   * Fills the tenant part with the company's name and with its data where the field names match.
   * @param company the company of the order.
   * @param structure the product's tenant structure.
   */
  private _buildTenant(company: CoreResponseCompanyDto, structure: CoreStructureField[]): void {
    const tenant = this.provisionForm.controls.tenant;
    const data = this._structureGroup(structure);
    tenant.setControl('data', data);

    const companyValues = company as unknown as Record<string, unknown>;
    const matching = Object.fromEntries(structure
      .filter(field => !field.generated && companyValues[field.name] !== undefined && companyValues[field.name] !== null)
      .map(field => [field.name, companyValues[field.name]]));
    tenant.patchValue({
      name: company.name,
      data: StructureDynamicFormService.formatDataForForm(matching, structure),
    });
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

  /**
   * Turns the values of a structure group into the data the backend expects, without the generated fields.
   * @param values the raw values of the group.
   * @param structure the structure.
   * @returns the data.
   */
  private _parseData(values: Record<string, unknown>, structure: CoreStructureField[]): Record<string, unknown> {
    const fields = structure.filter(field => !field.generated);
    const parsed = StructureDynamicFormService.parseDataByStructure(values, fields);
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== null && value !== undefined && value !== ''));
  }
}
