import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideDownload, lucideEllipsisVertical, lucideInbox, lucidePencil, lucideSearch, lucideTrash2, lucideUndo2 } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, finalize, map, Observable } from 'rxjs';
import { CoreResponseInvoiceDto, CoreResponseScheduleEntryDto, CoreResponseSchedulePageDto } from '../../../../../../../libs/api/src';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { DateRangeFilterComponent } from '../../../../components/date-range-filter/date-range-filter.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { ElectronicInvoiceDirective } from '../../../../directives/electronic-invoice.directive';
import { InvoiceStatusDirective } from '../../../../directives/invoice-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { CustomerChargeKind } from '../../../../enums/customer-charge-kind.enum';
import { InvoiceStatus } from '../../../../enums/invoice-status.enum';
import { ScheduleDirection } from '../../../../enums/schedule-direction.enum';
import { ScheduleStatus } from '../../../../enums/schedule-status.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { PageRequest } from '../../../../interfaces/page.interface';
import { ChargeCadencePipe } from '../../../../pipes/charge-cadence/charge-cadence.pipe';
import { ElectronicInvoicePipe } from '../../../../pipes/electronic-invoice/electronic-invoice.pipe';
import { InvoiceStatusPipe } from '../../../../pipes/invoice-status/invoice-status.pipe';
import { CustomerChargesApiService, ResellerInvoicesFilters, ResellerScheduleFilters } from '../../../../services/api-services/customer-charges/customer-charges-api.service';
import { InvoicesApiService } from '../../../../services/api-services/invoices/invoices-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { endOfDay, hasEmptySelection, orUndefined, sameFilters, startOfDay } from '../../../../utils/filters.util';
import { dueStateOf, invoiceDueState, InvoiceDueState } from '../../../../utils/invoice-due.util';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';
import { FilterResellerScheduleForm } from '../../interfaces/filter-reseller-schedule-form.interface';
import { CollectedDialogComponent } from '../collected-dialog/collected-dialog.component';

/**
 * What the list shows: the schedule of the reseller, or its invoices, the due dates of its customers among them once
 * reached.
 */
export type ResellerScheduleListMode = 'schedule' | 'invoices';

/** Values of the schedule filters. */
type ResellerScheduleFilterValues = ReturnType<FormGroup<FilterResellerScheduleForm>['getRawValue']>;

/** State of an invoice, paid to Keus or collected from a customer, as the filter offers it. */
const SETTLEMENT_OPTIONS: ComboboxOption[] = [
  { value: 'OPEN', label: 'Aperte' },
  { value: 'CLOSED', label: 'Saldate' },
];

/** Which way the money goes, as the filter offers it. */
const DIRECTION_OPTIONS: ComboboxOption[] = [
  { value: ScheduleDirection.ToKeus, label: 'In uscita' },
  { value: ScheduleDirection.FromCustomer, label: 'In entrata' },
];

/**
 * Returns the period the list opens with, counted when asked so that a page left open across a month moves with it:
 * the schedule looks to the end of the next month, the invoices to the end of the current one.
 * @param mode what the list shows.
 * @returns the period.
 */
function defaultPeriod(mode: ResellerScheduleListMode): { from: Date; to: Date } {
  const now = new Date();
  const months = mode === 'invoices' ? 1 : 2;
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + months, 0) };
}

/**
 * Returns the filters the list opens with, and that the reset brings back.
 * @param mode what the list shows.
 * @returns the filters.
 */
function defaultScheduleFilters(mode: ResellerScheduleListMode): ResellerScheduleFilterValues {
  return { search: null, direction: null, state: null, period: defaultPeriod(mode) };
}

/**
 * List of the schedule of the reseller whose workspace is open, by due date: the invoices of Keus it pays, on the
 * 4th of the month, and what it collects from its customers, the shares of its contracts and its own items, with the
 * payments expected both ways until they are recorded. The reseller marks each due date of a customer collected. On its invoices the same entries come latest first, the
 * invoices of Keus paid too and the due dates of the customers only once reached and collected.
 */
@Component({
  selector: 'rocket-reseller-schedule-list',
  imports: [
    ...BrnDialogImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmEmptyImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    DateRangeFilterComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    ElectronicInvoiceDirective,
    InvoiceStatusDirective,
    NgIcon,
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    CollectedDialogComponent,
    DatePipe,
    LowerCasePipe,
    ChargeCadencePipe,
    ElectronicInvoicePipe,
    InvoiceStatusPipe,
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideCircleCheck, lucideDownload, lucideEllipsisVertical, lucideInbox, lucidePencil, lucideSearch, lucideTrash2, lucideUndo2 }),
  ],
  templateUrl: './reseller-schedule-list.component.html',
})
export class ResellerScheduleListComponent {
  /** Customer charges API service instance. */
  private readonly _customerChargesApiService = inject(CustomerChargesApiService);

  /** Invoices API service instance. */
  private readonly _invoicesApiService = inject(InvoicesApiService);

  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Whether the electronic invoices of Sibill are shown. */
  readonly integrationsEnabled = INTEGRATIONS_ENABLED;

  /** Pages of the schedule. */
  readonly pager = inject<CursorPaginationService<CoreResponseScheduleEntryDto>>(CursorPaginationService);

  /** What the list shows. */
  mode = input<ResellerScheduleListMode>('schedule');

  /** Reference to the delete dialog. */
  deleteDialog = viewChild<BrnDialog>('deleteDialog');

  /** Directions offered by the filter. */
  readonly directionOptions = DIRECTION_OPTIONS;

  /** Direction of an invoice of Keus. */
  readonly toKeus = ScheduleDirection.ToKeus;

  /** Kind of a recurring item. */
  readonly recurring = CustomerChargeKind.Recurring;

  /** Kind of the share of a contract. */
  readonly contractShare = CustomerChargeKind.Contract;

  /** Status a due date collected shows. */
  readonly paid = InvoiceStatus.Paid;

  /** Status a due date still to collect shows. */
  readonly open = InvoiceStatus.Open;

  /** Status of a payment expected from a contract, not recorded yet. */
  readonly expectedStatus = ScheduleStatus.Expected;

  /** Form group for filtering the schedule. */
  scheduleFilterForm = new FormGroup<FilterResellerScheduleForm>({
    search: new FormControl<string | null>(defaultScheduleFilters('schedule').search),
    direction: new FormControl<string[] | null>(defaultScheduleFilters('schedule').direction),
    state: new FormControl<string[] | null>(defaultScheduleFilters('schedule').state),
    period: new FormControl(defaultScheduleFilters('schedule').period),
  });

  /** Filters applied to the schedule. */
  appliedFilters = signal<ResellerScheduleFilterValues>(defaultScheduleFilters('schedule'));

  /** Due date whose item waits for the confirmation of its deletion. */
  pendingDelete = signal<CoreResponseScheduleEntryDto | null>(null);

  /** Whether the deletion is running. */
  isDeleting = signal<boolean>(false);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.scheduleFilterForm.valueChanges.pipe(map(() => this.scheduleFilterForm.getRawValue())),
    { initialValue: this.scheduleFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), defaultScheduleFilters(this.mode())));

  /** Whether the list shows the invoices of the reseller. */
  readonly isInvoices = computed(() => this.mode() === 'invoices');

  /** States offered by the filter, on the invoices only: the schedule shows only what is still open. */
  readonly stateOptions = SETTLEMENT_OPTIONS;

  /** Whether the user adds, edits and marks the items of the customers. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageCustomerCharges));

  /**
   * Constructor of the component.
   */
  constructor() {
    // Open the filters of the mode, known only once the input is bound; first, so the first page reads them.
    effect(() => {
      const filters = defaultScheduleFilters(this.mode());

      untracked(() => {
        this.scheduleFilterForm.reset(filters);
        this.appliedFilters.set(filters);
      });
    });

    // Read the first page when the reseller of the workspace or the applied filters change.
    effect(() => {
      const resellerId = this._context.resellerId();
      const filters = this.appliedFilters();

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._load(resellerId, page, filters)));
    });
  }

  /**
   * Reads the current page again.
   */
  loadSchedule(): void {
    this.pager.reload();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.scheduleFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.scheduleFilterForm.reset(defaultScheduleFilters(this.mode()));
    this.appliedFilters.set(defaultScheduleFilters(this.mode()));
  }

  /**
   * Tells whether a due date still to pay or to collect is past or falls within a week; an expected one has no marker.
   * @param entry the due date.
   * @returns the marker, or null.
   */
  dueState(entry: CoreResponseScheduleEntryDto): InvoiceDueState | null {
    if (entry.invoice) return invoiceDueState(entry.invoice);
    if (entry.expected) return null;

    return entry.collected ? null : dueStateOf(entry.dueDate);
  }

  /**
   * Opens the pro forma of an invoice of Keus in a new tab.
   * @param invoice the invoice.
   */
  downloadProForma(invoice: CoreResponseInvoiceDto): void {
    this._invoicesApiService.getProFormaUrl(invoice.billedPartyId, invoice.id).subscribe(url => openInNewTab(url));
  }

  /**
   * Returns the address of the page of the item of a due date of a customer.
   * @param entry the due date.
   * @returns the route, or null on an invoice of Keus.
   */
  chargeRoute(entry: CoreResponseScheduleEntryDto): string[] | null {
    return entry.charge ? [this._context.basePath(), 'billing', 'schedule', 'charges', entry.charge.id] : null;
  }

  /**
   * Tells whether the item of a due date was added by hand, so that it changes and is deleted.
   * @param entry the due date.
   * @returns true for an item added by hand.
   */
  isManual(entry: CoreResponseScheduleEntryDto): boolean {
    return !!entry.charge && entry.charge.kind !== CustomerChargeKind.Contract;
  }

  /**
   * Opens the confirmation of the deletion of the item of a due date.
   * @param entry the due date.
   */
  openDeleteDialog(entry: CoreResponseScheduleEntryDto): void {
    this.pendingDelete.set(entry);
    this.deleteDialog()?.open();
  }

  /**
   * Closes the delete dialog.
   */
  closeDeleteDialog(): void {
    this.pendingDelete.set(null);
    this.deleteDialog()?.close();
  }

  /**
   * Deletes the item waiting for confirmation, with all its due dates, then reads the page again.
   */
  deleteCharge(): void {
    const resellerId = this._context.resellerId();
    const charge = this.pendingDelete()?.charge;
    if (!resellerId || !charge) return;

    this.isDeleting.set(true);
    this._customerChargesApiService.deleteCharge(resellerId, charge.id).pipe(finalize(() => this.isDeleting.set(false))).subscribe({
      next: () => {
        this.closeDeleteDialog();
        this.pager.reload();
      },
      error: (error) => console.error('Error deleting the item:', error),
    });
  }

  /**
   * Reads one page of the schedule or of the invoices of the reseller. A bound of the period left empty falls back to
   * the default one.
   * @param resellerId the reseller whose workspace is open, if any.
   * @param page the page to read.
   * @param filters the applied filters.
   * @returns the page of the list.
   */
  private _load(resellerId: string | null, page: PageRequest, filters: ResellerScheduleFilterValues): Observable<CoreResponseSchedulePageDto> {
    if (!resellerId) return EMPTY;

    const mode = this.mode();
    const from = startOfDay(filters.period?.from ?? defaultPeriod(mode).from);
    const to = endOfDay(filters.period?.to ?? defaultPeriod(mode).to);
    const state = this._single(filters.state);
    const closed = state === undefined ? undefined : state === 'CLOSED';
    const direction = this._single(filters.direction) as ResellerScheduleFilters['direction'];
    const search = orUndefined(filters.search);

    if (mode === 'invoices') {
      const query: ResellerInvoicesFilters = { direction, settled: closed, search };
      return this._customerChargesApiService.listInvoices(resellerId, from, to, page, query);
    }

    // As in the schedule of Keus, the entries settled stay in the calendar and in the invoices page.
    const query: ResellerScheduleFilters = { direction, settled: false, search };
    return this._customerChargesApiService.listSchedule(resellerId, from, to, page, query);
  }

  /**
   * Reads a filter of two options: one chosen narrows the list, none or both leave it open.
   * @param values the options chosen.
   * @returns the option chosen alone, or undefined.
   */
  private _single(values: string[] | null): string | undefined {
    return values?.length === 1 ? values[0] : undefined;
  }
}
