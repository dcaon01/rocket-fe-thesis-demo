import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucidePencil, lucidePlus, lucideTrash2, lucideInbox, lucideMail, lucideSearch, lucideEye } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { finalize, map, of, switchMap } from 'rxjs';
import { CoreResponseCompanyDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { CompanyStatusDirective } from '../../../../directives/company-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { ResellerOwnerPipe } from '../../../../pipes/reseller-owner/reseller-owner.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { CompaniesApiService, CompaniesFilters } from '../../../../services/api-services/companies/companies-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { UserContextService } from '../../../../services/user-context/user-context.service';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterCompanies } from '../../interfaces/filter-companies.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Values of the company filters. */
type CompanyFilterValues = ReturnType<FormGroup<FilterCompanies>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back. */
const DEFAULT_COMPANY_FILTERS: CompanyFilterValues = { name: null, email: null, status: null };

@Component({
  selector: 'rocket-companies',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmTableImports,
    ...HlmDialogImports,
    ...HlmTooltipImports,
    ...BrnDialogImports,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    NgIcon,
    ReactiveFormsModule,
    CompanyStatusDirective,
    ResellerOwnerPipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideEye, lucideMail, lucideSearch, lucideInbox,
      lucidePlus,
      lucidePencil,
      lucideTrash2
    })
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css'
})
export class CompaniesComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Application context service. */
  private readonly _context = inject(AppContextService);

  /** User context service. */
  private readonly _userContext = inject(UserContextService);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Companies API service instance. */
  private readonly _companiesApiService = inject(CompaniesApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Whether the user sees which reseller manages each record. */
  readonly canViewOwnership = computed(() => this._permissions.can(Capability.ViewResellerOwnership) && !this.isResellerWorkspace());

  /** Whether the user can create companies. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageCompanies));

  /** Whether the user can create a company here: in a reseller workspace only the reseller does, so the company is its own. */
  readonly canCreate = computed(() => this.canManage() && (!this.isResellerWorkspace() || this._userContext.isReseller()));

  /** Whether the page is opened inside a reseller workspace. */
  readonly isResellerWorkspace = computed(() => !!this._context.resellerId());

  /** Code of the reseller whose workspace is open, to list its companies only. */
  private readonly _resellerCode = toSignal(
    toObservable(this._context.resellerId).pipe(
      switchMap(resellerId => resellerId
        ? this._resellersApiService.getReseller(resellerId).pipe(map(reseller => reseller.code))
        : of(null)),
    ),
    { initialValue: null },
  );

  /** Whether the user can delete companies. */
  readonly canDelete = computed(() => this._permissions.can(Capability.DeleteCompanies));

  /** Pages of the companies. */
  readonly pager = inject<CursorPaginationService<CoreResponseCompanyDto>>(CursorPaginationService);

  /** Dialog reference. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Dialog content reference. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /** Company statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = [{ value: 'ACTIVE', label: 'Attivo' }, { value: 'INACTIVE', label: 'Non attivo' }];

  /** Form group for filtering companies. */
  companiesFilterForm = new FormGroup<FilterCompanies>({
    name: new FormControl<string | null>(DEFAULT_COMPANY_FILTERS.name),
    email: new FormControl<string | null>(DEFAULT_COMPANY_FILTERS.email),
    status: new FormControl<string[] | null>(DEFAULT_COMPANY_FILTERS.status)
  });

  /** Filters applied to the list. */
  appliedFilters = signal<CompanyFilterValues>(DEFAULT_COMPANY_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.companiesFilterForm.valueChanges.pipe(map(() => this.companiesFilterForm.getRawValue())),
    { initialValue: this.companiesFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_COMPANY_FILTERS));

  /** Selected company for deletion. */
  selectedCompany: CoreResponseCompanyDto | null = null;

  /** Loading signal. */
  isLoading = signal<boolean>(false);

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page whenever the applied filters or the reseller of the workspace change.
    effect(() => {
      const { name, email, status } = this.appliedFilters();
      const resellerCode = this._resellerCode();
      if (this.isResellerWorkspace() && !resellerCode) return;

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._companiesApiService.listCompanies(page, {
        name: orUndefined(name),
        email: orUndefined(email),
        status: orUndefined(status) as CompaniesFilters['status'],
        ...(resellerCode ? { resellerCode } : {}),
      })));
    });

    // Manage dialog state changes.
    effect(() => {
      const state = this.dialogContent()?.state();
      if (state === 'closed') {
        this.closeDeleteCompanyDialog();
      }
    });
  }

  /**
   * Reads the current page again.
   */
  loadCompanies(): void {
    this.pager.reload();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.companiesFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.companiesFilterForm.reset(DEFAULT_COMPANY_FILTERS);
    this.appliedFilters.set(DEFAULT_COMPANY_FILTERS);
  }

  /**
   * Navigate to the company creation page.
   */
  goToCreateCompany(): void {
    this._router.navigate(['create'], { relativeTo: this._activatedRoute });
  }

  /**
   * Go to the edit company page.
   * @param companyId the company identifier.
   */
  goToEditCompany(companyId: string): void {
    this._router.navigate(['edit', companyId], { relativeTo: this._activatedRoute });
  }

  /**
   * Get the status string based on the company's status.
   * @param status The company's status.
   * @returns 'Attivo' if active, 'Non attivo' otherwise.
   */
  getStatus(status?: 'ACTIVE' | 'INACTIVE'): string {
    return status === 'ACTIVE' ? 'Attivo' : 'Non attivo';
  }

  /**
   * Opens the delete company confirmation dialog.
   * @param companyId the identifier of the company.
   */
  openDeleteCompanyDialog(companyId: string): void {
    this.selectedCompany = this.pager.items().find(c => c.id === companyId) || null;
    this.dialog()?.open();
  }

  /**
   * Closes the delete company confirmation dialog.
   */
  closeDeleteCompanyDialog(): void {
    this.selectedCompany = null;
    this.dialog()?.close();
  }

  /**
   * Deletes a company.
   */
  deleteCompany(): void {
    if (!this.selectedCompany) return;

    this.isLoading.set(true);
    this._companiesApiService.deleteCompany(this.selectedCompany.id).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.closeDeleteCompanyDialog();
        this.loadCompanies();
      })
    ).subscribe();
  }
}
