import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideInbox, lucidePencil, lucidePlus, lucideTrash2, lucideSearch } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, map } from 'rxjs';
import { CoreResponseResellerContractDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { ContractStatusDirective } from '../../../../directives/contract-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { ResellerContractStatus } from '../../../../enums/reseller-contract-status.enum';
import { ResellerTier } from '../../../../enums/reseller-tier.enum';
import { ContractStatusPipe } from '../../../../pipes/contract-status/contract-status.pipe';
import { ResellerTierPipe } from '../../../../pipes/reseller-tier/reseller-tier.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { ResellerContractsApiService, ResellerContractsFilters } from '../../../../services/api-services/reseller-contracts/reseller-contracts-api.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterResellerContractsForm } from '../../interfaces/filter-reseller-contracts-form.interface';

/** Values of the reseller contract filters. */
type ResellerContractFilterValues = ReturnType<FormGroup<FilterResellerContractsForm>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back. */
const DEFAULT_RESELLER_CONTRACT_FILTERS: ResellerContractFilterValues = { search: null, tier: null, status: null };

/**
 * Page of the contracts between Keus and its resellers: the fee and the margins of each one.
 */
@Component({
  selector: 'rocket-reseller-contracts',
  imports: [
    ...HlmInputGroupImports,
    ...BrnDialogImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmEmptyImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    ContractStatusDirective,
    ContractStatusPipe,
    ResellerTierPipe,
    ReactiveFormsModule,
    NgIcon,
    DatePipe
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideSearch,
      lucideInbox,
      lucidePencil,
      lucidePlus,
      lucideTrash2
    })
  ],
  templateUrl: './reseller-contracts.component.html',
  styleUrl: './reseller-contracts.component.css'
})
export class ResellerContractsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);
  /** Reseller contracts API service instance. */
  private readonly _resellerContractsService = inject(ResellerContractsApiService);
  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);
  /** Pages of the reseller contracts. */
  readonly pager = inject<CursorPaginationService<CoreResponseResellerContractDto>>(CursorPaginationService);

  /** Reseller tiers offered by the tier filter. */
  readonly tierOptions: ComboboxOption[] = Object.values(ResellerTier).map(tier => ({ value: tier, label: new ResellerTierPipe().transform(tier) }));
  /** Statuses offered by the status filter. */
  readonly statusOptions: ComboboxOption[] = [ResellerContractStatus.Draft, ResellerContractStatus.Signed, ResellerContractStatus.Active, ResellerContractStatus.EndedAtRenewal, ResellerContractStatus.Ended]
    .map(status => ({ value: status, label: new ContractStatusPipe().transform(status) }));

  /** Form group for filtering the reseller contracts. */
  filterForm = new FormGroup<FilterResellerContractsForm>({
    search: new FormControl<string | null>(DEFAULT_RESELLER_CONTRACT_FILTERS.search),
    tier: new FormControl<string[] | null>(DEFAULT_RESELLER_CONTRACT_FILTERS.tier),
    status: new FormControl<string[] | null>(DEFAULT_RESELLER_CONTRACT_FILTERS.status),
  });

  /** Filters applied to the list. */
  appliedFilters = signal<ResellerContractFilterValues>(DEFAULT_RESELLER_CONTRACT_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.filterForm.valueChanges.pipe(map(() => this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_RESELLER_CONTRACT_FILTERS));

  /** Whether the user can open a reseller contract. */
  readonly canOpen = computed(() => this._permissions.can(Capability.OpenResellerContracts));

  /** Reference to the delete dialog. */
  deleteDialog = viewChild<BrnDialog>('deleteDialog');

  /** Draft waiting for the delete confirmation. */
  selectedContract = signal<CoreResponseResellerContractDto | null>(null);

  /** Whether the deletion is running. */
  isLoading = signal<boolean>(false);

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page whenever the applied filters change.
    effect(() => {
      const filters = this.appliedFilters();

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._resellerContractsService.listContracts(page, this._toQuery(filters))));
    });
  }

  /**
   * Whether a contract can be deleted from the list: only a draft.
   * @param contract the contract.
   * @returns true when the trash icon is shown.
   */
  canDelete(contract: CoreResponseResellerContractDto): boolean {
    return this.canOpen() && contract.status === ResellerContractStatus.Draft;
  }

  /**
   * Opens the delete dialog for a draft.
   * @param contract the draft to delete.
   */
  openDeleteDialog(contract: CoreResponseResellerContractDto): void {
    this.selectedContract.set(contract);
    this.deleteDialog()?.open();
  }

  /**
   * Closes the delete dialog.
   */
  closeDeleteDialog(): void {
    this.selectedContract.set(null);
    this.deleteDialog()?.close();
  }

  /**
   * Deletes the selected draft and reloads the list.
   */
  deleteContract(): void {
    const contract = this.selectedContract();
    if (!contract) return;

    this.isLoading.set(true);
    this._resellerContractsService.deleteContract(contract.resellerId, contract.id).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.closeDeleteDialog();
        this.pager.reload();
      })
    ).subscribe();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.filterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.filterForm.reset(DEFAULT_RESELLER_CONTRACT_FILTERS);
    this.appliedFilters.set(DEFAULT_RESELLER_CONTRACT_FILTERS);
  }

  /**
   * Computes the renewal date of a contract.
   * @param contract the contract.
   * @returns the renewal date.
   */
  renewalDateOf(contract: CoreResponseResellerContractDto): Date {
    const date = new Date(contract.validityDate);
    date.setFullYear(date.getFullYear() + contract.validityYears);
    return date;
  }

  /**
   * Navigates to the page that opens a new reseller contract.
   */
  goToCreateContract(): void {
    this._router.navigate(['/billing/reseller-contracts/create']);
  }

  /**
   * Navigates to the page of a reseller contract.
   * @param contract the contract to open.
   */
  goToContract(contract: CoreResponseResellerContractDto): void {
    this._router.navigate(['/billing/reseller-contracts', contract.resellerId, contract.id]);
  }

  /**
   * Turns the filter values into the query of the listing.
   * @param filters the filter values.
   * @returns the query.
   */
  private _toQuery(filters: ResellerContractFilterValues): ResellerContractsFilters {
    return {
      search: orUndefined(filters.search),
      tier: orUndefined(filters.tier) as ResellerContractsFilters['tier'],
      status: orUndefined(filters.status) as ResellerContractsFilters['status'],
    };
  }
}
