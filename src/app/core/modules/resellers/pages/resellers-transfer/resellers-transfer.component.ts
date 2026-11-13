import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideInbox, lucideReceiptText, lucideSend } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, concatMap, EMPTY, expand, finalize, from, map, merge, mergeMap, Observable, of, reduce, switchMap, tap, toArray } from 'rxjs';
import { CoreResponseCompanyDto, CoreResponseContractDto, CoreResponsePlanDto, CoreResponseResellerDto, CoreTransferCompanyDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { ContractStatus } from '../../../../enums/contract-status.enum';
import { PlanAudience } from '../../../../enums/plan-audience.enum';
import { PlanStatus } from '../../../../enums/plan-status.enum';
import { CompaniesApiService } from '../../../../services/api-services/companies/companies-api.service';
import { ContractsApiService } from '../../../../services/api-services/contracts/contracts-api.service';
import { PlansApiService } from '../../../../services/api-services/plans/plans-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { COMBOBOX_PAGE_SIZE, remoteOptions } from '../../../../utils/remote-options.util';
import { TransferDestination } from '../../enums/transfer-destination.enum';
import { TransferCompaniesForm, TransferLineForm } from '../../interfaces/transfer-companies-form.interface';
import { formSteps, StepTab } from '../../../../utils/form-steps.util';
import { businessErrorMessage } from '../../../../utils/business-error.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

/** Size of the pages that read the companies of the reseller and the plans of a product, the largest the backend serves. */
const PAGE_SIZE = 100;

/** Contract reads running at once while the companies of the reseller are loaded. */
const CONTRACT_READS = 5;

/** Why the backend refused the transfer of a company, by error code. */
const TRANSFER_ERRORS: Record<string, string> = {
  RESELLER_NOT_INACTIVE: 'il rivenditore non è più disattivo',
  RESELLER_NOT_ACTIVE: 'il rivenditore di destinazione non è attivo',
  RESELLER_PRODUCT_NOT_ENABLED: 'prodotto non abilitato sul rivenditore di destinazione',
  CONTRACT_TERMINATING: 'un contratto è in disdetta',
  ORDER_IN_PROVISIONING: 'un ordine è ancora in erogazione',
  COMPANY_FISCAL_DATA_INCOMPLETE: 'dati fiscali incompleti',
  COMPANY_IBAN_MISSING: 'manca l\'IBAN',
  TRANSFER_PLAN_MISSING: 'manca il piano di un contratto',
  TENANT_WITHOUT_REFERENT: 'un tenant non ha un referente',
  TRANSFER_IN_PROGRESS: 'un altro trasferimento della stessa azienda è in corso',
};


/** A company of the inactive reseller, with its contracts in force. */
export interface TransferCandidate {
  /** The company. */
  company: CoreResponseCompanyDto;
  /** Its contracts in force. */
  contracts: CoreResponseContractDto[];
}

/**
 * Transfer of the companies of an inactive reseller (UR-RK-105), one request per company: to another active reseller,
 * which takes over the contracts as they are, or to Keus, which takes each contract over on the same tenant with a
 * direct contract on a plan for companies.
 */
@Component({
  selector: 'rocket-resellers-transfer',
  imports: [
    ...BrnComboboxImports,
    ...BrnSelectImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmCheckboxImports,
    ...HlmComboboxImports,
    ...HlmEmptyImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTableImports,
    ...HlmTabsImports,
    ...HlmTooltipImports,
    NgIcon,
    PageHeaderComponent,
    ReactiveFormsModule,
    RouterLink,
    StepListComponent,
  ],
  providers: [provideIcons({ lucideBuilding2, lucideInbox, lucideReceiptText, lucideSend })],
  templateUrl: './resellers-transfer.component.html',
  styleUrl: './resellers-transfer.component.css'
})
export class ResellersTransferComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Companies API service instance. */
  private readonly _companiesApiService = inject(CompaniesApiService);

  /** Contracts API service instance. */
  private readonly _contractsApiService = inject(ContractsApiService);

  /** Plans API service instance. */
  private readonly _plansApiService = inject(PlansApiService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Identifier of the inactive reseller, from the route. */
  readonly resellerId: string = this._activatedRoute.snapshot.params['resellerId'];

  /** Where the companies can go, with their labels. */
  readonly destinations = [
    { value: TransferDestination.Keus, label: 'Keus' },
    { value: TransferDestination.Reseller, label: 'Altro rivenditore' },
  ];

  /** Filter used by the comboboxes to match the typed text. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** The transfer form. */
  readonly transferForm = new FormGroup<TransferCompaniesForm>({
    destination: new FormControl<TransferDestination>(TransferDestination.Keus, { nonNullable: true }),
    resellerId: new FormControl<string | null>(null),
    companyIds: new FormControl<string[]>([], { nonNullable: true }),
    lines: new FormArray<FormGroup<TransferLineForm>>([]),
  });

  /** The inactive reseller. */
  readonly reseller = signal<CoreResponseResellerDto | null>(null);

  /** Companies of the reseller with their contracts in force. */
  readonly candidates = signal<TransferCandidate[]>([]);

  /** Whether the companies are being read. */
  readonly isLoading = signal(true);

  /** Whether the transfer is being sent. */
  readonly isSending = signal(false);

  /** Resellers read by the destination combobox, by identifier, for the products they sell. */
  private readonly _targets = signal<ReadonlyMap<string, CoreResponseResellerDto>>(new Map());

  /** Active plans of the products of the contracts, by product. */
  private readonly _plansByProduct = signal<Record<string, CoreResponsePlanDto[]>>({});

  /** Active resellers the companies can go to, searched by name. */
  readonly resellers = remoteOptions(search =>
    this._resellersApiService.listResellers({ limit: COMBOBOX_PAGE_SIZE }, { companyName: search, status: ['ACTIVE'] }).pipe(
      map(page => page.items.filter(reseller => reseller.id !== this.resellerId)),
      tap(read => this._targets.update(known => new Map([...known, ...read.map(reseller => [reseller.id, reseller] as const)]))),
      map(read => read.map(reseller => ({ value: reseller.id, label: `${reseller.companyName} (${reseller.code})` }))),
    ),
  );

  /** Converts a reseller identifier to its name and code, used by the combobox for filtering and display. */
  readonly resellerLabel = (id: string): string => this.resellers.labelOf(id) ?? '';

  /** Converts a plan identifier to its name, used by the combobox for filtering and display. */
  readonly planLabel = (planId: string): string =>
    Object.values(this._plansByProduct()).flat().find(plan => plan.id === planId)?.name ?? '';

  /** The chosen destination; read off the control so it is current when the other controls react to it. */
  private readonly _destination = toSignal(this.transferForm.controls.destination.valueChanges, { initialValue: this.transferForm.controls.destination.value });

  /** The chosen reseller identifier. */
  private readonly _resellerId = toSignal(this.transferForm.controls.resellerId.valueChanges, { initialValue: this.transferForm.controls.resellerId.value });

  /** The selected company identifiers. */
  private readonly _companyIds = toSignal(this.transferForm.controls.companyIds.valueChanges, { initialValue: this.transferForm.controls.companyIds.value });

  /** The validity of the transfer form, kept as a signal for the computed state. */
  private readonly _status = toSignal(this.transferForm.statusChanges, { initialValue: this.transferForm.status });

  /** Whether the companies go to Keus. */
  readonly isKeus = computed(() => this._destination() === TransferDestination.Keus);

  /** The reseller the companies go to, once chosen. */
  readonly target = computed(() => {
    const resellerId = this._resellerId();
    return resellerId ? this._targets().get(resellerId) ?? null : null;
  });

  /** Why each company cannot be transferred to the chosen destination, by company; absent when it can. */
  readonly blockedReasons = computed(() => new Map(this.candidates()
    .map(candidate => [candidate.company.id, this._blockedReason(candidate)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null)));

  /** Companies the admin can select. */
  readonly selectable = computed(() => this.candidates().filter(candidate => !this.blockedReasons().has(candidate.company.id)));

  /** Companies selected for the transfer. */
  readonly selected = computed(() => this.candidates().filter(candidate => this._companyIds().includes(candidate.company.id)));

  /** Whether every selectable company is selected. */
  readonly allSelected = computed(() => this.selectable().length > 0 && this.selected().length === this.selectable().length);

  /** Why the transfer cannot start, or null when it can. */
  readonly blockedReason = computed(() => {
    const reseller = this.reseller();
    if (!reseller) return null;
    if (reseller.status !== 'INACTIVE') return 'Il rivenditore è attivo: le sue aziende si trasferiscono solo dopo averlo disattivato.';
    return null;
  });

  /** Subtitle of the page: what the transfer does on the chosen destination, or why it cannot start. */
  readonly description = computed(() => {
    const blocked = this.blockedReason();
    if (blocked) return blocked;
    return this.isKeus()
      ? 'Sposta i contratti in vigore a Keus sullo stesso tenant, dalla fine del periodo già pagato.'
      : 'Sposta i contratti in vigore all\'altro rivenditore così come sono, dal prossimo periodo.';
  });

  /** Whether the transfer can be sent. */
  readonly canSend = computed(() => !this.blockedReason()
    && !this.isSending()
    && this.selected().length > 0
    && (this.isKeus() || !!this.target())
    && this._status() === 'VALID');

  /** Steps of the form; the plans of the direct contracts matter only on the way to Keus. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'destination', label: 'Destinazione', icon: 'lucideSend' },
    { id: 'companies', label: 'Aziende', icon: 'lucideBuilding2' },
    { id: 'plans', label: 'Piani diretti', icon: 'lucideReceiptText', disabled: !this.isKeus(), hint: 'Solo verso Keus: un rivenditore tiene i contratti come sono.' },
  ]);

  /** Navigation through the sections, one after the other while creating. */
  readonly steps = formSteps(this.tabs, computed(() => false));

  /**
   * Constructor of the component: loads the reseller with its companies, and keeps selection and lines in step with
   * the destination.
   */
  constructor() {
    // Load the reseller and its companies.
    this._loadCandidates();

    // Drop the companies the new destination refuses, and rebuild the lines of the direct contracts.
    const { destination, resellerId, companyIds } = this.transferForm.controls;
    merge(destination.valueChanges, resellerId.valueChanges, companyIds.valueChanges).pipe(takeUntilDestroyed()).subscribe(() => {
      const kept = companyIds.value.filter(id => !this._blockedReason(this.candidates().find(candidate => candidate.company.id === id)));
      if (kept.length !== companyIds.value.length) {
        companyIds.setValue(kept);
        return;
      }
      if (this.tabs().find(tab => tab.id === this.steps.activeTab())?.disabled) {
        this.steps.activate('companies');
      }
      this._syncLines();
    });
  }

  /** The line groups of the form. */
  get lineGroups(): FormGroup<TransferLineForm>[] {
    return this.transferForm.controls.lines.controls;
  }

  /**
   * Selects or deselects a company.
   * @param companyId the identifier of the company.
   * @param checked whether the company is selected.
   */
  toggleCompany(companyId: string, checked: boolean): void {
    const ids = this.transferForm.controls.companyIds.value.filter(id => id !== companyId);
    this.transferForm.controls.companyIds.setValue(checked ? [...ids, companyId] : ids);
  }

  /**
   * Selects every selectable company, or none.
   * @param checked whether the companies are selected.
   */
  toggleAll(checked: boolean): void {
    this.transferForm.controls.companyIds.setValue(checked ? this.selectable().map(candidate => candidate.company.id) : []);
  }

  /**
   * Returns the active plans for companies of a product, the ones a direct contract can take.
   * @param productId the product.
   * @returns the plans.
   */
  plansFor(productId: string): CoreResponsePlanDto[] {
    return (this._plansByProduct()[productId] ?? []).filter(plan =>
      plan.status === PlanStatus.Active && plan.audience === PlanAudience.Company);
  }

  /**
   * Returns the name of a product.
   * @param productId the product.
   * @returns the name, or the identifier while the products are being read.
   */
  productName(productId: string): string {
    return this._productsCacheService.products().find(product => product.id === productId)?.name ?? productId;
  }

  /**
   * Returns the company of a line.
   * @param companyId the identifier of the company.
   * @returns the company with its contracts, if read.
   */
  candidateOf(companyId: string): TransferCandidate | undefined {
    return this.candidates().find(candidate => candidate.company.id === companyId);
  }

  /**
   * Returns the contract in force a line takes over.
   * @param line the line group.
   * @returns the contract, if read.
   */
  contractOf(line: FormGroup<TransferLineForm>): CoreResponseContractDto | undefined {
    return this.candidateOf(line.controls.companyId.value)?.contracts.find(contract => contract.productId === line.controls.productId.value);
  }

  /**
   * Transfers the selected companies one after the other, with the requests built at once so that the form can no
   * longer change them. A company refused by the backend stays with the reseller, selected with its plans, to be
   * transferred again, read again with its contracts; once every company is moved the page goes back to the reseller.
   */
  transfer(): void {
    if (!this.canSend()) return;

    const requests = this.transferForm.controls.companyIds.value.map(id => ({ id, body: this._transferOf(id) }));
    this.isSending.set(true);
    this.transferForm.disable({ emitEvent: false });
    from(requests).pipe(
      concatMap(({ id, body }) => this._companiesApiService.transferCompany(id, body).pipe(
        map(() => null),
        catchError((error: HttpErrorResponse) => of({
          id,
          reason: TRANSFER_ERRORS[error.error?.details?.code] ?? businessErrorMessage(error) ?? 'errore imprevisto',
        })),
      )),
      toArray(),
      finalize(() => {
        this.transferForm.enable({ emitEvent: false });
        this.isSending.set(false);
      }),
    ).subscribe(results => {
      const failed = results.filter(result => result !== null);
      if (failed.length === 0) {
        this._router.navigate(['/resellers/edit', this.resellerId]);
        return;
      }
      // The interceptor says a request failed, not which company nor why.
      const names = failed.map(({ id, reason }) => `${this._companyName(id)}: ${reason}`);
      this._toasterService.showError(`Non trasferite: ${names.join('; ')}.`);
      this.transferForm.controls.companyIds.setValue(failed.map(({ id }) => id));
      this._reloadFailed(failed.map(({ id }) => id));
    });
  }

  /**
   * Reads the reseller, its companies with their contracts in force, and the plans of their products.
   */
  private _loadCandidates(): void {
    this.isLoading.set(true);

    this._resellersApiService.getReseller(this.resellerId).pipe(
      tap(reseller => this.reseller.set(reseller)),
      switchMap(reseller => this._readAll(cursor => this._companiesApiService.listCompanies({ limit: PAGE_SIZE, cursor }, { resellerCode: reseller.code }))),
      switchMap(companies => this._withContracts(companies)),
      finalize(() => this.isLoading.set(false)),
    ).subscribe(candidates => {
      this.candidates.set(candidates);
      new Set(candidates.flatMap(candidate => candidate.contracts.map(contract => contract.productId))).forEach(productId => this._loadPlans(productId));
    });
  }

  /**
   * Keeps in the list only the companies whose transfer failed, with their contracts read again: a transfer towards
   * Keus may have stopped after some of them changed.
   * @param companyIds the identifiers of the companies still with the reseller.
   */
  private _reloadFailed(companyIds: string[]): void {
    const companies = this.candidates().filter(candidate => companyIds.includes(candidate.company.id)).map(candidate => candidate.company);
    this.isLoading.set(true);

    this._withContracts(companies).pipe(finalize(() => this.isLoading.set(false))).subscribe(candidates => this.candidates.set(candidates));
  }

  /**
   * Reads the contracts in force of some companies, a few companies at a time.
   * @param companies the companies.
   * @returns the companies with their contracts in force, in the same order.
   */
  private _withContracts(companies: CoreResponseCompanyDto[]): Observable<TransferCandidate[]> {
    return from(companies).pipe(
      mergeMap(company => this._contractsApiService.getContractsByCompany(company.id).pipe(map(contracts => ({
        company,
        contracts: contracts.filter(contract => contract.status !== ContractStatus.Terminated),
      }))), CONTRACT_READS),
      toArray(),
      map(read => companies.flatMap(company => read.filter(candidate => candidate.company.id === company.id))),
    );
  }

  /**
   * Returns the name of a company of the list.
   * @param companyId the identifier of the company.
   * @returns the name of the company, or its identifier until it is read.
   */
  private _companyName(companyId: string): string {
    const company = this.candidateOf(companyId)?.company;
    return company?.name || companyId;
  }

  /**
   * Reads the active plans of a product, once.
   * @param productId the identifier of the product.
   */
  private _loadPlans(productId: string): void {
    if (this._plansByProduct()[productId]) return;
    this._readAll(cursor => this._plansApiService.listPlans({ limit: PAGE_SIZE, cursor }, { productId, status: [PlanStatus.Active] }))
      .subscribe(plans => this._plansByProduct.update(current => ({ ...current, [productId]: plans })));
  }

  /**
   * Reads every page of a listing.
   * @param readPage reads the page after a cursor, the first one without.
   * @returns the items of every page.
   */
  private _readAll<T>(readPage: (cursor?: string) => Observable<{ items: T[]; nextCursor?: string }>): Observable<T[]> {
    return readPage().pipe(
      expand(page => page.nextCursor ? readPage(page.nextCursor) : EMPTY),
      reduce((items, page) => [...items, ...page.items], [] as T[]),
    );
  }

  /**
   * Tells why a company cannot go to the chosen destination: on the way to Keus a contract being cancelled, or
   * incomplete fiscal data when it has contracts to take over; on the way to a reseller a product it does not sell.
   * @param candidate the company with its contracts in force.
   * @returns the reason, or null when the company can go.
   */
  private _blockedReason(candidate: TransferCandidate | undefined): string | null {
    if (!candidate) return null;

    if (this.isKeus()) {
      if (candidate.contracts.some(contract => contract.status === ContractStatus.Terminating)) {
        return 'Un contratto è in disdetta: va ritirata o lasciata scadere prima del passaggio a Keus.';
      }
      // Without contracts in force no direct contract is opened, so the backend asks for no fiscal data.
      return candidate.contracts.length === 0 || this._hasFiscalData(candidate.company) ? null : 'Mancano dati fiscali, sede legale o IBAN: vanno completati nella scheda dell\'azienda.';
    }

    const target = this.target();
    if (target && candidate.contracts.some(contract => !target.productIds?.includes(contract.productId))) {
      return 'Prodotto non abilitato sul rivenditore di destinazione.';
    }
    return null;
  }

  /**
   * Tells whether a company has the data the direct channel needs, as the backend checks them: VAT number or fiscal
   * code, PEC or SDI, legal address and IBAN.
   * @param company the company.
   * @returns true when the data are complete.
   */
  private _hasFiscalData(company: CoreResponseCompanyDto): boolean {
    const hasTaxId = /^\d{11}$/.test(company.vatNumber ?? '') || /^([A-Z0-9]{16}|\d{11})$/i.test(company.fiscalCode ?? '');
    const address = company.legalAddress;
    return hasTaxId && !!(company.pec || company.sdi) && !!(address?.street && address.city && address.zipCode) && !!company.iban;
  }

  /**
   * Rebuilds the lines of the direct contracts from the selected companies, keeping the plans already chosen.
   */
  private _syncLines(): void {
    const lines = this.transferForm.controls.lines;
    const wanted = this.isKeus()
      ? this.selected().flatMap(candidate => candidate.contracts.map(contract => ({ companyId: candidate.company.id, productId: contract.productId })))
      : [];
    const existing = lines.controls;
    const groups = wanted.map(({ companyId, productId }) =>
      existing.find(group => group.controls.companyId.value === companyId && group.controls.productId.value === productId)
      ?? new FormGroup<TransferLineForm>({
        companyId: new FormControl<string>(companyId, { nonNullable: true }),
        productId: new FormControl<string>(productId, { nonNullable: true }),
        planId: new FormControl<string | null>(null, [Validators.required]),
        recurringDiscountPercent: new FormControl<number | null>(0, [Validators.min(0), Validators.max(100)]),
      }));

    lines.clear({ emitEvent: false });
    groups.forEach(group => lines.push(group, { emitEvent: false }));
    lines.updateValueAndValidity();
  }

  /**
   * Builds the transfer of a company: the reseller it goes to, or the plans of its direct contracts.
   * @param companyId the identifier of the company.
   * @returns the request body.
   */
  private _transferOf(companyId: string): CoreTransferCompanyDto {
    if (!this.isKeus()) {
      return { resellerId: this.transferForm.controls.resellerId.value ?? undefined };
    }

    const lines = this.lineGroups
      .filter(group => group.controls.companyId.value === companyId)
      .map(group => group.getRawValue())
      .map(line => ({
        productId: line.productId,
        planId: line.planId ?? '',
        ...(line.recurringDiscountPercent ? { recurringDiscountPercent: line.recurringDiscountPercent } : {}),
      }));
    return { lines };
  }
}
