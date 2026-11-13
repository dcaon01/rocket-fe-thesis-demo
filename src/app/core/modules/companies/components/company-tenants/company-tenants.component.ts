import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideInbox, lucidePencil, lucideSearch, lucideUserPlus } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, map, of, switchMap } from 'rxjs';
import { CoreResponseTenantDto } from '../../../../../../../libs/api/src';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { Capability } from '../../../../enums/capability.enum';
import { TenantStatus } from '../../../../enums/tenant-status.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { TenantStatusPipe } from '../../../../pipes/tenant-status/tenant-status.pipe';
import { TenantsApiService } from '../../../../services/api-services/tenants/tenants-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { sameFilters } from '../../../../utils/filters.util';
import { TenantStatusDirective } from '../../../workspaces/directives/tenant-status.directive';
import { FilterCompanyTenantsForm } from '../../interfaces/filter-company-tenants-form.interface';

/** Values of the tenant filters. */
type TenantFilterValues = ReturnType<FormGroup<FilterCompanyTenantsForm>['getRawValue']>;

/** Filters the table opens with, and that the reset brings back. */
const DEFAULT_TENANT_FILTERS: TenantFilterValues = { search: null, productId: null, status: null };

/**
 * Tenants of a company on every product, those of its terminated contracts included.
 * A company has few tenants, all read at once, so the filters work on the page. A tenant is born from the delivery
 * of an order, so here it opens and gets new users, but is never created.
 * Usage: <rocket-company-tenants [companyId]="company.id" />
 */
@Component({
  selector: 'rocket-company-tenants',
  imports: [
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmComboboxImports,
    ...BrnComboboxImports,
    ...HlmEmptyImports,
    ...HlmInputImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    MultiSelectFilterComponent,
    TenantStatusDirective,
    TenantStatusPipe,
    NgIcon,
    ReactiveFormsModule,
  ],
  providers: [
    provideIcons({ lucideEye, lucideInbox, lucidePencil, lucideSearch, lucideUserPlus })
  ],
  templateUrl: './company-tenants.component.html',
})
export class CompanyTenantsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance: the detail of the company. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Tenants API service instance. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Toaster service instance, to say when the read fails. */
  private readonly _toasterService = inject(ToasterService);

  /** Identifier of the company the tenants belong to. */
  companyId = input.required<string>();

  /** Tenant statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(TenantStatus)
    .filter(status => status !== TenantStatus.Deleted)
    .map(status => ({ value: status, label: new TenantStatusPipe().transform(status) }));

  /** Filter of the product combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Products a tenant can belong to. */
  readonly products = this._productsCacheService.products;

  /** Converts a product identifier to its name, for the product combobox. */
  readonly productLabel = (productId: string): string => this._productNames().get(productId) ?? '';

  /** Form group for filtering the tenants. */
  tenantsFilterForm = new FormGroup<FilterCompanyTenantsForm>({
    search: new FormControl<string | null>(DEFAULT_TENANT_FILTERS.search),
    productId: new FormControl<string | null>(DEFAULT_TENANT_FILTERS.productId),
    status: new FormControl<string[] | null>(DEFAULT_TENANT_FILTERS.status),
  });

  /** Filters applied to the table. */
  appliedFilters = signal<TenantFilterValues>(DEFAULT_TENANT_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.tenantsFilterForm.valueChanges.pipe(map(() => this.tenantsFilterForm.getRawValue())),
    { initialValue: this.tenantsFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_TENANT_FILTERS));

  /** Tenants of the company, by name; a new company replaces a read still running. */
  private readonly _tenants = toSignal(
    toObservable(this.companyId).pipe(
      switchMap(companyId => this._tenantsApiService.getTenantsByCompany(companyId).pipe(catchError(() => {
        this._toasterService.showError('Impossibile leggere i tenant dell\'azienda.');
        return of([]);
      }))),
    ),
    { initialValue: [] as CoreResponseTenantDto[] },
  );

  /** Tenants that match the applied filters. */
  readonly tenants = computed(() => {
    const { search, productId, status } = this.appliedFilters();
    const name = search?.trim().toLowerCase();
    return this._tenants().filter(tenant =>
      (!name || tenant.name.toLowerCase().startsWith(name))
      && (!productId || tenant.productId === productId)
      && (status === null || status.includes(tenant.status))
    );
  });

  /** Whether the user can change the tenants; otherwise it only reads them. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageTenants));

  /** Whether the user can add users to the tenants. */
  readonly canAddUsers = computed(() => this._permissions.can(Capability.ManageUsers));

  /** Product names by identifier. */
  private readonly _productNames = computed(() => new Map(this.products().map(product => [product.id, product.name])));

  /**
   * Applies the filters of the form.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.tenantsFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults.
   */
  resetFilters(): void {
    this.tenantsFilterForm.reset(DEFAULT_TENANT_FILTERS);
    this.appliedFilters.set(DEFAULT_TENANT_FILTERS);
  }

  /**
   * Returns the name of the product of a tenant.
   * @param tenant the tenant.
   * @returns the product name, or its identifier when the product is unknown.
   */
  productOf(tenant: CoreResponseTenantDto): string {
    return this._productNames().get(tenant.productId) ?? tenant.productId;
  }

  /**
   * Tells whether a user can be added to a tenant: only the product's active tenants take new users.
   * @param tenant the tenant.
   * @returns true when the add icon is shown.
   */
  canAddUserTo(tenant: CoreResponseTenantDto): boolean {
    return this.canAddUsers() && tenant.status === TenantStatus.Active;
  }

  /**
   * Opens the detail of a tenant within the company.
   * @param tenant the tenant to open.
   */
  goToTenant(tenant: CoreResponseTenantDto): void {
    this._router.navigate(['tenants', tenant.productId, tenant.id], { relativeTo: this._activatedRoute });
  }

  /**
   * Opens the creation of a user on a tenant of the company.
   * @param tenant the tenant the user is added to.
   */
  goToCreateUser(tenant: CoreResponseTenantDto): void {
    this._router.navigate(['users', tenant.productId, 'create'], { relativeTo: this._activatedRoute, queryParams: { tenantId: tenant.id } });
  }
}
