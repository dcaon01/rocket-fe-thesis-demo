import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideEye, lucidePencil, lucidePlus, lucideRefreshCw, lucideTrash2, lucideInbox, lucideSearch } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmError, HlmHint } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { finalize, map } from 'rxjs';
import { CoreResponseTenantDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { Capability } from '../../../../enums/capability.enum';
import { TenantStatus } from '../../../../enums/tenant-status.enum';
import { TenantStatusPipe } from '../../../../pipes/tenant-status/tenant-status.pipe';
import { ResellerOwnerPipe } from '../../../../pipes/reseller-owner/reseller-owner.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { TenantsApiService, TenantsFilters } from '../../../../services/api-services/tenants/tenants-api.service';
import { TenantStatusDirective } from '../../directives/tenant-status.directive';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterTenantsForm } from '../../interfaces/filter-tenants-form.interface';
import { toSignal } from '@angular/core/rxjs-interop';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { ON_PRODUCT_STATUSES, PURGEABLE_STATUSES } from '../../../../constants/provisioning-statuses';
import { SyncStateDirective } from '../../../../directives/sync-state.directive';
import { SyncState } from '../../../../enums/sync-state.enum';
import { SyncStatePipe } from '../../../../pipes/sync-state/sync-state.pipe';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Values of the tenant filters. */
type TenantFilterValues = ReturnType<FormGroup<FilterTenantsForm>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back. */
const DEFAULT_TENANT_FILTERS: TenantFilterValues = { search: null, status: [TenantStatus.Active, TenantStatus.Inactive, TenantStatus.Requested] };

@Component({
  selector: 'rocket-tenants',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmTableImports,
    ...HlmLabelImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    HlmError,
    ReactiveFormsModule,
    HlmHint,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    NgIcon,
    TenantStatusPipe,
    TenantStatusDirective,
    SyncStateDirective,
    SyncStatePipe,
    ...HlmTooltipImports,
    ResellerOwnerPipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideSearch, lucideInbox,
      lucidePlus,
      lucidePencil,
      lucideEye,
      lucideRefreshCw,
      lucideTrash2
    })
  ],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.css'
})
export class TenantsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Router instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Tenants API service instance. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Whether the user sees which reseller manages each record. */
  readonly canViewOwnership = computed(() => this._permissions.can(Capability.ViewResellerOwnership));

  /** Whether the user can delete tenants. */
  readonly canDelete = computed(() => this._permissions.can(Capability.DeleteTenants));

  /** Whether the user can change tenants; otherwise it only reads them. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageTenants));

  /** Whether the user can create tenants by hand: a reseller's are born from the delivery of its orders. */
  readonly canCreate = computed(() => this._permissions.can(Capability.CreateTenants));

  /** Pages of the tenants. */
  readonly pager = inject<CursorPaginationService<CoreResponseTenantDto>>(CursorPaginationService);

  /** Dialog reference. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Dialog content reference. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /** Form group for filtering tenants. */
  tenantsFilterForm = new FormGroup<FilterTenantsForm>({
    search: new FormControl<string | null>(DEFAULT_TENANT_FILTERS.search),
    status: new FormControl<string[] | null>(DEFAULT_TENANT_FILTERS.status)
  });

  /** Filters applied to the list. */
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

  /** Tenant statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(TenantStatus).map(status => ({ value: status, label: new TenantStatusPipe().transform(status) }));

  /** Statuses of the tenants that can be removed for good: deleted on the product, or a discarded request. */
  readonly purgeableStatuses = PURGEABLE_STATUSES;

  /** Whether the open dialog removes the tenant for good instead of asking the product to delete it. */
  readonly isPurge = signal(false);

  /** Selected tenant identifier. */
  selectedTenant: CoreResponseTenantDto | null = null;

  /** Form group for deleting a tenant. */
  deleteForm = new FormGroup({
    name: new FormControl<string>('', [Validators.required])
  });

  /** Error message signal for delete tenant form. */
  errorMessage = signal<string | null>(null);

  /** Loading signal. */
  isLoading = signal<boolean>(false);

  /** Refresh cooldown signal (seconds remaining). */
  refreshCooldown = signal<number>(0);

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

      untracked(() => this.pager.load(page => this._tenantsApiService.listTenants(page, { productId, ...this._toQuery(filters) })));
    });

    // Manage dialog state changes.
    effect(() => {
      const state = this.dialogContent()?.state();
      if (state === 'closed') {
        this.closeDeleteTenantDialog();
      }
    });
  }

  /**
   * Reads the current page again.
   */
  loadTenants(): void {
    this.pager.reload();
  }

  /**
   * Refreshes tenants with a 5 second cooldown.
   */
  refreshTenants(): void {
    this.refreshCooldown.set(5);
    this.loadTenants();
    const interval = setInterval(() => {
      const remaining = this.refreshCooldown() - 1;
      this.refreshCooldown.set(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.tenantsFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.tenantsFilterForm.reset(DEFAULT_TENANT_FILTERS);
    this.appliedFilters.set(DEFAULT_TENANT_FILTERS);
  }

  /**
   * Navigate to the create tenant page.
   */
  goToCreateTenant(): void {
    this._router.navigate(['create'], { relativeTo: this._activatedRoute });
  }

  /**
   * Navigate to the edit tenant page.
   * @param tenantId the identifier of the tenant.
   */
  goToEditTenant(tenantId: string): void {
    this._router.navigate(['edit', tenantId], { relativeTo: this._activatedRoute });
  }

  /**
   * Opens the delete tenant confirmation dialog.
   * @param tenantId the identifier of the tenant.
   */
  openDeleteTenantDialog(tenantId: string): void {
    this.selectedTenant = this.pager.items().find(c => c.id === tenantId) || null;
    this.isPurge.set(PURGEABLE_STATUSES.includes(this.selectedTenant?.status ?? ''));
    this.dialog()?.open();
  }

  /**
   * Closes the delete tenant confirmation dialog.
   */
  closeDeleteTenantDialog(): void {
    this.selectedTenant = null;
    this.deleteForm.reset();
    this.errorMessage.set(null);
    this.dialog()?.close();
  }

  /**
   * Deletes a tenant.
   */
  deleteTenant(): void {
    const productId = this._activatedRoute.snapshot.paramMap.get('productId') || '';
    const input = this.deleteForm.value;
    if (!this.selectedTenant) return;

    if (input.name === this.selectedTenant.name) {
      this.isLoading.set(true);
      const request$ = this.isPurge()
        ? this._tenantsApiService.purgeTenant(productId, this.selectedTenant.id)
        : this._tenantsApiService.deleteTenant(productId, this.selectedTenant.id).pipe(map(() => undefined));
      request$.pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.closeDeleteTenantDialog();
          this.loadTenants();
        })
      ).subscribe();
    } else {
      this.deleteForm.reset();
      this.errorMessage.set("Il nome del tenant non corrisponde.");
    }
  }

  /**
   * Tells whether an operation on the tenant waits for the product or failed.
   * @param tenant the tenant of the row.
   * @returns whether an operation is open.
   */
  hasOpenOperation(tenant: CoreResponseTenantDto): boolean {
    return [SyncState.Pending, SyncState.Failed].includes(tenant.syncState as SyncState);
  }

  /**
   * Tells whether the product can be asked to delete the tenant: it has it, and no other operation is open.
   * @param tenant the tenant of the row.
   * @returns whether the deletion can be asked.
   */
  isDeletable(tenant: CoreResponseTenantDto): boolean {
    return ON_PRODUCT_STATUSES.includes(tenant.status) && !this.hasOpenOperation(tenant);
  }

  /**
   * Turns the filter values into the query of the listing.
   * @param filters the filter values.
   * @returns the query.
   */
  private _toQuery(filters: TenantFilterValues): Omit<TenantsFilters, 'productId'> {
    return {
      search: orUndefined(filters.search),
      status: orUndefined(filters.status) as TenantsFilters['status'],
    };
  }
}
