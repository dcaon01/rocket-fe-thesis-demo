import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideInbox, lucidePencil, lucideRefreshCw, lucideCalendarCog, lucideSearch } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { map } from 'rxjs';
import { CoreResponseContractDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { DateRangeFilterComponent } from '../../../../components/date-range-filter/date-range-filter.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { ContractStatusDirective } from '../../../../directives/contract-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { ContractStatus } from '../../../../enums/contract-status.enum';
import { ContractStatusPipe } from '../../../../pipes/contract-status/contract-status.pipe';
import { ResellerOwnerPipe } from '../../../../pipes/reseller-owner/reseller-owner.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { DateRange } from '../../../../interfaces/date-range.interface';
import { ContractsApiService, ContractsFilters } from '../../../../services/api-services/contracts/contracts-api.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { endOfDay, hasEmptySelection, orUndefined, sameFilters, startOfDay } from '../../../../utils/filters.util';
import { FilterContractsForm } from '../../interfaces/filter-contracts-form.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Values of the contract filters. */
type ContractFilterValues = ReturnType<FormGroup<FilterContractsForm>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back. */
const DEFAULT_CONTRACT_FILTERS: ContractFilterValues = { search: null, status: null, dateType: 'startDate', period: { from: null, to: null } };

@Component({
  selector: 'rocket-contracts',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmTableImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTooltipImports,
    ...BrnSelectImports,
    PageHeaderComponent,
    DateRangeFilterComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    NgIcon,
    ReactiveFormsModule,
    ContractStatusPipe,
    ContractStatusDirective,
    DatePipe,
    ResellerOwnerPipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideCalendarCog, lucideSearch,
      lucideInbox,
      lucidePencil,
      lucideRefreshCw
    })
  ],
  templateUrl: './contracts.component.html',
  styleUrl: './contracts.component.css'
})
export class ContractsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Router instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Pages of the contracts. */
  readonly pager = inject<CursorPaginationService<CoreResponseContractDto>>(CursorPaginationService);

  /** Contracts API service instance. */
  private readonly _contractsApiService = inject(ContractsApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Whether the user sees which reseller manages each record. */
  readonly canViewOwnership = computed(() => this._permissions.can(Capability.ViewResellerOwnership));

  /** Contract statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(ContractStatus).map(status => ({ value: status, label: new ContractStatusPipe().transform(status) }));

  /** Form group for filtering contracts. */
  contractsFilterForm = new FormGroup<FilterContractsForm>({
    search: new FormControl<string | null>(DEFAULT_CONTRACT_FILTERS.search),
    status: new FormControl<string[] | null>(DEFAULT_CONTRACT_FILTERS.status),
    dateType: new FormControl<string | null>(DEFAULT_CONTRACT_FILTERS.dateType),
    period: new FormControl<DateRange | null>(DEFAULT_CONTRACT_FILTERS.period),
  });

  /** Filters applied to the list. */
  appliedFilters = signal<ContractFilterValues>(DEFAULT_CONTRACT_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.contractsFilterForm.valueChanges.pipe(map(() => this.contractsFilterForm.getRawValue())),
    { initialValue: this.contractsFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_CONTRACT_FILTERS));

  /** Loading state signal. */
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

      untracked(() => this.pager.load(page => this._contractsApiService.listContracts(page, { productId, ...this._toQuery(filters) })));
    });
  }

  /**
   * Reads the current page again.
   */
  loadContracts(): void {
    this.pager.reload();
  }

  /**
   * Refreshes contracts with a 5 second cooldown.
   */
  refreshContracts(): void {
    this.refreshCooldown.set(5);
    this.loadContracts();
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
    this.appliedFilters.set(this.contractsFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.contractsFilterForm.reset(DEFAULT_CONTRACT_FILTERS);
    this.appliedFilters.set(DEFAULT_CONTRACT_FILTERS);
  }

  /**
   * Navigates to the contract detail page.
   * @param contractId the identifier of the contract.
   */
  goToContract(contractId: string): void {
    this._router.navigate([contractId], { relativeTo: this._activatedRoute });
  }

  /**
   * Turns the filter values into the query of the listing.
   * @param filters the filter values.
   * @returns the query.
   */
  private _toQuery(filters: ContractFilterValues): Omit<ContractsFilters, 'productId'> {
    return {
      search: orUndefined(filters.search),
      status: orUndefined(filters.status) as ContractsFilters['status'],
      dateField: filters.dateType as ContractsFilters['dateField'],
      from: startOfDay(filters.period?.from),
      to: endOfDay(filters.period?.to),
    };
  }
}
