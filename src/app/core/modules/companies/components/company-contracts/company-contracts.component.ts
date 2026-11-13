import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox, lucideSearch, lucideSquareArrowOutUpRight } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, map } from 'rxjs';
import { CoreResponseContractDto } from '../../../../../../../libs/api/src';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { ContractStatusDirective } from '../../../../directives/contract-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { ContractStatus } from '../../../../enums/contract-status.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { ContractStatusPipe } from '../../../../pipes/contract-status/contract-status.pipe';
import { ContractsApiService } from '../../../../services/api-services/contracts/contracts-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { sameFilters } from '../../../../utils/filters.util';
import { FilterCompanyContractsForm } from '../../interfaces/filter-company-contracts-form.interface';

/** Values of the contract filters. */
type ContractFilterValues = ReturnType<FormGroup<FilterCompanyContractsForm>['getRawValue']>;

/** Filters the table opens with, and that the reset brings back. */
const DEFAULT_CONTRACT_FILTERS: ContractFilterValues = { search: null, productId: null, status: null };

/**
 * Contracts of a company on every product, with the cancellation of the active ones.
 * A company has few contracts, all read at once, so the filters work on the page.
 * A reseller cancels the contracts of its own customers, since the relationship with them is its own.
 * Usage: <rocket-company-contracts [companyId]="company.id" />
 */
@Component({
  selector: 'rocket-company-contracts',
  imports: [
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmComboboxImports,
    ...BrnComboboxImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmEmptyImports,
    ...HlmInputImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    MultiSelectFilterComponent,
    ContractStatusDirective,
    ContractStatusPipe,
    DatePipe,
    NgIcon,
    ReactiveFormsModule,
  ],
  providers: [
    provideIcons({ lucideInbox, lucideSearch, lucideSquareArrowOutUpRight })
  ],
  templateUrl: './company-contracts.component.html',
})
export class CompanyContractsComponent {
  /** Contracts API service instance. */
  private readonly _contractsApiService = inject(ContractsApiService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Identifier of the company the contracts belong to. */
  companyId = input.required<string>();

  /** Cancellation confirmation dialog. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Contract statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(ContractStatus).map(status => ({ value: status, label: new ContractStatusPipe().transform(status) }));

  /** Filter of the product combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Products a contract can belong to. */
  readonly products = this._productsCacheService.products;

  /** Converts a product identifier to its name, for the product combobox. */
  readonly productLabel = (productId: string): string => this._productNames().get(productId) ?? '';

  /** Form group for filtering the contracts. */
  contractsFilterForm = new FormGroup<FilterCompanyContractsForm>({
    search: new FormControl<string | null>(DEFAULT_CONTRACT_FILTERS.search),
    productId: new FormControl<string | null>(DEFAULT_CONTRACT_FILTERS.productId),
    status: new FormControl<string[] | null>(DEFAULT_CONTRACT_FILTERS.status),
  });

  /** Filters applied to the table. */
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

  /** Contracts of the company, the ones in force first. */
  private readonly _contracts = signal<CoreResponseContractDto[]>([]);

  /** Contracts that match the applied filters. */
  readonly contracts = computed(() => {
    const { search, productId, status } = this.appliedFilters();
    const code = search?.trim().toLowerCase();
    return this._contracts().filter(contract =>
      (!code || contract.code.toLowerCase().startsWith(code))
      && (!productId || contract.productId === productId)
      && (status === null || status.includes(contract.status))
    );
  });

  /** Contract awaiting the cancellation confirmation. */
  selectedContract = signal<CoreResponseContractDto | null>(null);

  /** Loading signal for the cancellation. */
  isLoading = signal<boolean>(false);

  /** Product names by identifier. */
  private readonly _productNames = computed(() => new Map(this.products().map(product => [product.id, product.name])));

  /**
   * Constructor that reads the contracts of the company.
   */
  constructor() {
    // Read the contracts whenever the company changes.
    effect(() => {
      const companyId = this.companyId();
      untracked(() => this._loadContracts(companyId));
    });
  }

  /**
   * Applies the filters of the form.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.contractsFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults.
   */
  resetFilters(): void {
    this.contractsFilterForm.reset(DEFAULT_CONTRACT_FILTERS);
    this.appliedFilters.set(DEFAULT_CONTRACT_FILTERS);
  }

  /**
   * Returns the name of the product of a contract.
   * @param contract the contract.
   * @returns the product name, or its identifier when the product is unknown.
   */
  productOf(contract: CoreResponseContractDto): string {
    return this._productNames().get(contract.productId) ?? contract.productId;
  }

  /**
   * Tells whether a contract can be cancelled: active and renewing.
   * @param contract the contract.
   * @returns true when the cancel icon is shown.
   */
  isCancellable(contract: CoreResponseContractDto): boolean {
    return this._permissions.canChangeContract(Capability.CancelContracts, contract)
      && contract.status === ContractStatus.Active
      && !!contract.renewalDate;
  }

  /**
   * Opens the cancellation confirmation dialog.
   * @param contract the contract to cancel.
   */
  openCancelDialog(contract: CoreResponseContractDto): void {
    this.selectedContract.set(contract);
    this.dialog()?.open();
  }

  /**
   * Closes the cancellation confirmation dialog.
   */
  closeCancelDialog(): void {
    this.selectedContract.set(null);
    this.dialog()?.close();
  }

  /**
   * Records the cancellation of the selected contract and reads the contracts again.
   */
  cancelContract(): void {
    const contract = this.selectedContract();
    if (!contract) return;

    this.isLoading.set(true);
    this._contractsApiService.terminateAtRenewal(contract.productId, contract.id).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe(() => {
      this.closeCancelDialog();
      this._loadContracts(this.companyId());
    });
  }

  /**
   * Reads the contracts of a company, the ones in force first and the latest first among equals.
   * @param companyId the identifier of the company.
   */
  private _loadContracts(companyId: string): void {
    this._contractsApiService.getContractsByCompany(companyId).subscribe(contracts => {
      const ended = (contract: CoreResponseContractDto): number => contract.status === ContractStatus.Terminated ? 1 : 0;
      this._contracts.set([...contracts].sort((a, b) => ended(a) - ended(b) || b.startDate.localeCompare(a.startDate)));
    });
  }
}
