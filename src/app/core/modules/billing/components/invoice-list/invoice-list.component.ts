import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideCircleCheck, lucideDownload, lucideEllipsisVertical, lucideFileText, lucideInbox, lucideLink, lucideRefreshCw, lucideSend, lucideSearch } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, map, Observable } from 'rxjs';
import { CoreResponseExpectedChargeDto, CoreResponseInvoiceDto, CoreResponseInvoicesPageDto, CoreResponseScheduleEntryDto, CoreResponseSchedulePageDto } from '../../../../../../../libs/api/src';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { DateRangeFilterComponent } from '../../../../components/date-range-filter/date-range-filter.component';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { ElectronicInvoiceDirective } from '../../../../directives/electronic-invoice.directive';
import { InvoiceStatusDirective } from '../../../../directives/invoice-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { InvoiceDocumentStatus } from '../../../../enums/invoice-document-status.enum';
import { InvoiceStatus } from '../../../../enums/invoice-status.enum';
import { ScheduleStatus } from '../../../../enums/schedule-status.enum';
import { DunningStepPipe } from '../../../../pipes/dunning-step/dunning-step.pipe';
import { ElectronicInvoicePipe } from '../../../../pipes/electronic-invoice/electronic-invoice.pipe';
import { InvoiceStatusPipe } from '../../../../pipes/invoice-status/invoice-status.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { DateRange } from '../../../../interfaces/date-range.interface';
import { PageRequest } from '../../../../interfaces/page.interface';
import { InvoicesApiService, InvoicesFilters, ScheduleFilters } from '../../../../services/api-services/invoices/invoices-api.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { endOfDay, hasEmptySelection, orUndefined, sameFilters, startOfDay } from '../../../../utils/filters.util';
import { expectedContractRoute, invoiceContractRoute, invoiceDueState, InvoiceDueState, invoiceEntry } from '../../../../utils/invoice-due.util';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';
import { FilterInvoicesForm } from '../../interfaces/filter-invoices-form.interface';

/** What a list shows: the invoices of a period, or the payment schedule of a period. */
export type InvoiceListMode = 'issued' | 'schedule';

/** Action on an invoice confirmed in the dialog. */
type InvoiceAction = 'paid' | 'reissue' | 'reissueVerified' | 'link';

/** Values of the invoice filters. */
type InvoiceFilterValues = ReturnType<FormGroup<FilterInvoicesForm>['getRawValue']>;

/**
 * Returns the first and last day of the current month, the period the lists by period open with, counted when asked
 * so that a page left open across a month moves with it.
 * @returns the period.
 */
function currentMonth(): { from: Date; to: Date } {
  const now = new Date();
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
}

/**
 * Returns the filters the lists open with, and that the reset brings back.
 * @returns the filters.
 */
function defaultInvoiceFilters(): InvoiceFilterValues {
  return { search: null, status: null, document: null, period: currentMonth() };
}

/** States the list of a schedule shows: to collect, failed and expected; the paid ones stay in the calendar. */
const OPEN_SCHEDULE_STATUSES = [ScheduleStatus.Open, ScheduleStatus.Unpaid, ScheduleStatus.Expected];

/** Labels of the billed party kinds. */
const PARTY_LABELS: Record<string, string> = {
  COMPANY: 'Azienda',
  RESELLER: 'Rivenditore',
  FINANCIER: 'Finanziaria',
};

/**
 * List of invoices of the billing pages of the global area.
 * Each row shows the collection on Stripe and the electronic invoice at Sibill; who manages the invoices
 * also records payments, issues refused electronic invoices again and settles the uncertain ones.
 */
@Component({
  selector: 'rocket-invoice-list',
  imports: [
    ...HlmInputGroupImports,
    ...BrnDialogImports,
    ...BrnSelectImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmEmptyImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    DateRangeFilterComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    ElectronicInvoiceDirective,
    InvoiceStatusDirective,
    NgIcon,
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DunningStepPipe,
    ElectronicInvoicePipe,
    InvoiceStatusPipe,
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideSearch,
      lucideCircleCheck,
      lucideDownload,
      lucideEllipsisVertical,
      lucideFileText,
      lucideInbox,
      lucideLink,
      lucideRefreshCw,
      lucideSend,
    })
  ],
  templateUrl: './invoice-list.component.html',
})
export class InvoiceListComponent {
  /** Invoices API service instance. */
  private readonly _invoicesApiService = inject(InvoicesApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Pages of the list: invoices, and on a schedule the expected payments too. */
  readonly pager = inject<CursorPaginationService<CoreResponseScheduleEntryDto>>(CursorPaginationService);

  /** What the list shows. */
  mode = input.required<InvoiceListMode>();

  /** Title of the page; without one the list has no header, as inside a tab of a page that has it. */
  headerTitle = input<string>('');

  /** Description shown under the page title. */
  description = input<string>('');

  /** Reference to the action dialog. */
  actionDialog = viewChild<BrnDialog>('actionDialog');

  /** Status of an unpaid invoice, which shows its dunning. */
  readonly unpaid = InvoiceStatus.Unpaid;

  /** Status of an expected payment of the schedule. */
  readonly expectedStatus = ScheduleStatus.Expected;

  /** Collection statuses offered by the filter: on a schedule the open states of a payment, the expected one included. */
  readonly statusOptions = computed<ComboboxOption[]>(() => (this.isSchedule() ? OPEN_SCHEDULE_STATUSES : Object.values(InvoiceStatus))
    .map(status => ({ value: status, label: new InvoiceStatusPipe().transform(status) })));

  /** States of the electronic invoice offered by the filter. */
  readonly documentOptions: ComboboxOption[] = Object.values(InvoiceDocumentStatus)
    .map(document => ({ value: document, label: new ElectronicInvoicePipe().transform(document) }));

  /** Form group for filtering the invoices. */
  invoicesFilterForm = new FormGroup<FilterInvoicesForm>({
    search: new FormControl<string | null>(defaultInvoiceFilters().search),
    status: new FormControl<string[] | null>(defaultInvoiceFilters().status),
    document: new FormControl<string[] | null>(defaultInvoiceFilters().document),
    period: new FormControl<DateRange | null>(defaultInvoiceFilters().period),
  });

  /** Identifier of the document at Sibill, typed in the link dialog. */
  sibillIdControl = new FormControl<string | null>(null);

  /** Filters applied to the list. */
  appliedFilters = signal<InvoiceFilterValues>(defaultInvoiceFilters());

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.invoicesFilterForm.valueChanges.pipe(map(() => this.invoicesFilterForm.getRawValue())),
    { initialValue: this.invoicesFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), defaultInvoiceFilters()));

  /** Invoice and action waiting for confirmation. */
  pendingAction = signal<{ action: InvoiceAction; invoice: CoreResponseInvoiceDto } | null>(null);

  /** Whether an action is running. */
  isLoading = signal<boolean>(false);

  /** Whether the list is a payment schedule, which shows the due date first. */
  readonly isSchedule = computed(() => this.mode() === 'schedule');

  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Whether the electronic invoices of Sibill are shown. */
  readonly integrationsEnabled = INTEGRATIONS_ENABLED;

  /** Whether the user records payments and works on the electronic invoices. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageInvoices));

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the first page when the mode or the applied filters change.
    effect(() => {
      const mode = this.mode();
      const filters = this.appliedFilters();

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._load(mode, page, filters)));
    });
  }

  /**
   * Reads the current page again.
   */
  loadInvoices(): void {
    this.pager.reload();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.invoicesFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.invoicesFilterForm.reset(defaultInvoiceFilters());
    this.appliedFilters.set(defaultInvoiceFilters());
  }

  /**
   * Returns the label of the kind of a billed party.
   * @param type the kind of the billed party.
   * @returns the label.
   */
  partyLabel(type: string): string {
    return PARTY_LABELS[type] ?? type;
  }

  /**
   * Tells whether an open invoice of the schedule is past its due date or falls due within a week (UR-RK-153).
   * @param invoice the invoice.
   * @returns the marker, or null.
   */
  dueState(invoice: CoreResponseInvoiceDto): InvoiceDueState | null {
    return this.isSchedule() ? invoiceDueState(invoice) : null;
  }

  /**
   * Returns the address of the contract of an invoice.
   * @param invoice the invoice.
   * @returns the route, or null.
   */
  contractRoute(invoice: CoreResponseInvoiceDto): string[] | null {
    return invoiceContractRoute(invoice);
  }

  /**
   * Returns the address of the contract an expected payment comes from.
   * @param expected the expected payment.
   * @returns the route, or null.
   */
  expectedRoute(expected: CoreResponseExpectedChargeDto): string[] | null {
    return expectedContractRoute(expected);
  }

  /**
   * Opens the pro forma of an invoice to a reseller in a new tab.
   * @param invoice the invoice.
   */
  downloadProForma(invoice: CoreResponseInvoiceDto): void {
    this._invoicesApiService.getProFormaUrl(invoice.billedPartyId, invoice.id).subscribe(url => openInNewTab(url));
  }

  /**
   * Returns the actions the user may run on an invoice.
   * @param invoice the invoice.
   * @returns the actions, possibly none.
   */
  actionsFor(invoice: CoreResponseInvoiceDto): InvoiceAction[] {
    if (!this.canManage()) return [];

    const actions: InvoiceAction[] = [];

    if (!invoice.stripeInvoiceId && (invoice.status === InvoiceStatus.Open || invoice.status === InvoiceStatus.Unpaid)) {
      actions.push('paid');
    }

    // The draft at Sibill is created only for a paid invoice.
    if (invoice.status === InvoiceStatus.Paid && invoice.documentStatus === InvoiceDocumentStatus.Failed) {
      actions.push('reissue');
    }
    if (invoice.status === InvoiceStatus.Paid && (invoice.documentStatus === InvoiceDocumentStatus.Uncertain || invoice.documentStatus === InvoiceDocumentStatus.Issuing)) {
      actions.push('link', 'reissueVerified');
    }

    return actions;
  }

  /**
   * Opens the dialog of an action on an invoice.
   * @param action the action.
   * @param invoice the invoice.
   */
  openAction(action: InvoiceAction, invoice: CoreResponseInvoiceDto): void {
    this.sibillIdControl.reset(null);
    this.pendingAction.set({ action, invoice });
    this.actionDialog()?.open();
  }

  /**
   * Closes the action dialog.
   */
  closeActionDialog(): void {
    this.pendingAction.set(null);
    this.actionDialog()?.close();
  }

  /**
   * Runs the action waiting for confirmation, then reloads the list.
   */
  confirmAction(): void {
    const pending = this.pendingAction();
    if (!pending) return;

    const { billedPartyId, id } = pending.invoice;
    const sibillId = this.sibillIdControl.value?.trim();

    let request: Observable<void>;
    switch (pending.action) {
      case 'paid':
        request = this._invoicesApiService.markPaid(billedPartyId, id);
        break;
      case 'reissue':
        request = this._invoicesApiService.reissueDocument(billedPartyId, id, false);
        break;
      case 'reissueVerified':
        request = this._invoicesApiService.reissueDocument(billedPartyId, id, true);
        break;
      case 'link':
        if (!sibillId) return;
        request = this._invoicesApiService.linkDocument(billedPartyId, id, sibillId);
        break;
    }

    this.isLoading.set(true);
    // On a failure the dialog stays open with what was typed; the interceptor shows the error.
    request.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => {
        this.closeActionDialog();
        this.pager.reload();
      },
      error: (error) => console.error('Error running the action:', error),
    });
  }

  /**
   * Reads one page of the list of the mode from the backend, the invoices as due dates of a schedule. A bound of the
   * period left empty falls back to the one of the current month.
   * @param mode what the list shows.
   * @param page the page to read.
   * @param filters the applied filters.
   * @returns the page of the list.
   */
  private _load(
    mode: InvoiceListMode,
    page: PageRequest,
    filters: InvoiceFilterValues,
  ): Observable<CoreResponseSchedulePageDto> {
    const from = startOfDay(filters.period?.from ?? currentMonth().from);
    const to = endOfDay(filters.period?.to ?? currentMonth().to);
    const query: InvoicesFilters = {
      status: orUndefined(filters.status) as InvoicesFilters['status'],
      documentStatus: orUndefined(filters.document) as InvoicesFilters['documentStatus'],
      search: orUndefined(filters.search),
    };
    const asEntries = map((invoices: CoreResponseInvoicesPageDto): CoreResponseSchedulePageDto => ({ ...invoices, items: invoices.items.map(invoiceEntry) }));

    if (mode === 'schedule') {
      // No status chosen means every open one: the paid invoices are in the invoices page.
      const status = (query.status ?? OPEN_SCHEDULE_STATUSES) as ScheduleFilters['status'];
      return this._invoicesApiService.listScheduleOfPeriod(from, to, page, { ...query, status });
    }

    return this._invoicesApiService.listInvoicesOfPeriod(from, to, page, query).pipe(asEntries);
  }
}
