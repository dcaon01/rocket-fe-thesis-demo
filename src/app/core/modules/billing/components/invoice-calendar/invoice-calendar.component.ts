import { CurrencyPipe, LowerCasePipe, NgClass } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideSearch } from '@ng-icons/lucide';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, EMPTY, expand, map, Observable, of, reduce, switchMap } from 'rxjs';
import { CoreResponseExpectedChargeDto, CoreResponseInvoiceDto, CoreResponseScheduleEntryDto, CoreResponseSchedulePageDto } from '../../../../../../../libs/api/src';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { InvoiceStatusDirective } from '../../../../directives/invoice-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { CustomerChargeKind } from '../../../../enums/customer-charge-kind.enum';
import { InvoiceStatus } from '../../../../enums/invoice-status.enum';
import { ScheduleDirection } from '../../../../enums/schedule-direction.enum';
import { ScheduleStatus } from '../../../../enums/schedule-status.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { PageRequest } from '../../../../interfaces/page.interface';
import { ChargeCadencePipe } from '../../../../pipes/charge-cadence/charge-cadence.pipe';
import { DunningStepPipe } from '../../../../pipes/dunning-step/dunning-step.pipe';
import { InvoiceStatusPipe } from '../../../../pipes/invoice-status/invoice-status.pipe';
import { CustomerChargesApiService } from '../../../../services/api-services/customer-charges/customer-charges-api.service';
import { InvoicesApiService, ScheduleFilters } from '../../../../services/api-services/invoices/invoices-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { endOfDay, hasEmptySelection, orUndefined, sameFilters, startOfDay } from '../../../../utils/filters.util';
import { dueStateOf, expectedContractRoute, invoiceContractRoute, invoiceDueState, InvoiceDueState } from '../../../../utils/invoice-due.util';
import { FilterScheduleCalendarForm } from '../../interfaces/filter-schedule-calendar-form.interface';
import { CollectedDialogComponent } from '../collected-dialog/collected-dialog.component';

/** Which schedule the calendar shows: the one of Keus, or the one of the reseller whose workspace is open. */
export type InvoiceCalendarMode = 'schedule' | 'resellerSchedule';

/** Values of the calendar filters. */
type ScheduleCalendarFilterValues = ReturnType<FormGroup<FilterScheduleCalendarForm>['getRawValue']>;

/** One day of the month grid, with the due dates falling on it. */
interface CalendarCell {
  /** Day of the cell. */
  date: Date;
  /** Local day key (YYYY-MM-DD). */
  dayKey: string;
  /** Whether the day belongs to the displayed month. */
  inMonth: boolean;
  /** Due dates of the day: invoices and expected payments, and for a reseller the due dates of its customers. */
  entries: CoreResponseScheduleEntryDto[];
  /** Total of the invoices, in cents: what Keus collects, or what the reseller pays it. */
  totalCents: number;
  /** Total of the payments expected to Keus, in cents: the ones it expects, or the ones the reseller expects to pay it. */
  expectedCents: number;
  /** Total of the payments a reseller expects from its customers, net of VAT, in cents. */
  expectedCustomersCents: number;
  /** Total of the due dates of the customers of a reseller, net of VAT, in cents. */
  customersCents: number;
  /** Whether one of the due dates is unpaid, or past and still open. */
  late: boolean;
}

/** Filters the calendar opens with, and that the reset brings back. */
const DEFAULT_CALENDAR_FILTERS: ScheduleCalendarFilterValues = { search: null, status: null };

/** States of the payments of the schedule of Keus: to collect, failed, collected and expected. */
const SCHEDULE_STATUSES = [ScheduleStatus.Open, ScheduleStatus.Unpaid, ScheduleStatus.Paid, ScheduleStatus.Expected];

/** Page size used to read every invoice of the visible weeks. */
const PAGE_LIMIT = 100;

/**
 * Month calendar of the payment schedule: each day shows how many due dates fall on it and their total, and the side
 * panel lists the ones of the selected day. Keus sees the invoices it collects; a reseller sees what it pays Keus and
 * what it collects from its customers, and marks the due dates of its customers collected.
 */
@Component({
  selector: 'rocket-invoice-calendar',
  imports: [
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmPopoverImports,
    ...HlmTooltipImports,
    MultiSelectFilterComponent,
    InvoiceStatusDirective,
    NgClass,
    NgIcon,
    ReactiveFormsModule,
    RouterLink,
    CollectedDialogComponent,
    CurrencyPipe,
    LowerCasePipe,
    ChargeCadencePipe,
    DunningStepPipe,
    InvoiceStatusPipe,
  ],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideSearch })],
  templateUrl: './invoice-calendar.component.html',
})
export class InvoiceCalendarComponent {
  /** Invoices API service instance. */
  private readonly _invoicesApiService = inject(InvoicesApiService);

  /** Customer charges API service instance. */
  private readonly _customerChargesApiService = inject(CustomerChargesApiService);

  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Which schedule the calendar shows. */
  mode = input.required<InvoiceCalendarMode>();

  /** Weekday headers, Monday first. */
  readonly weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  /** Months of the month picker, January first. */
  readonly monthLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  /** Status of an unpaid invoice, which shows its dunning. */
  readonly unpaid = InvoiceStatus.Unpaid;

  /** Status a due date collected shows. */
  readonly paid = InvoiceStatus.Paid;

  /** Status a due date still to collect shows. */
  readonly open = InvoiceStatus.Open;

  /** Status of an expected payment. */
  readonly expectedStatus = ScheduleStatus.Expected;

  /** Direction of what a reseller pays Keus. */
  readonly toKeus = ScheduleDirection.ToKeus;

  /** Kind of a recurring item. */
  readonly recurring = CustomerChargeKind.Recurring;

  /** Kind of the share of a contract. */
  readonly contractShare = CustomerChargeKind.Contract;

  /** Key of today. */
  private readonly _todayKey = this._dayKey(new Date());

  /** States of the payments offered by the filter. */
  readonly statusOptions: ComboboxOption[] = SCHEDULE_STATUSES
    .map(status => ({ value: status, label: new InvoiceStatusPipe().transform(status) }));

  /** Form group for filtering the invoices. */
  calendarFilterForm = new FormGroup<FilterScheduleCalendarForm>({
    search: new FormControl<string | null>(DEFAULT_CALENDAR_FILTERS.search),
    status: new FormControl<string[] | null>(DEFAULT_CALENDAR_FILTERS.status),
  });

  /** Filters applied to the calendar. */
  appliedFilters = signal<ScheduleCalendarFilterValues>(DEFAULT_CALENDAR_FILTERS);

  /** First day of the displayed month. */
  currentMonth = signal<Date>(this._firstOfMonth(new Date()));

  /** Selected day, which drives the side panel. */
  selectedDay = signal<Date>(new Date());

  /** Whether the month picker is open. */
  monthPickerState = signal<BrnDialogState | null>(null);

  /** Year the month picker shows. */
  pickerYear = signal<number>(new Date().getFullYear());

  /** Due dates read for the visible weeks. */
  entries = signal<CoreResponseScheduleEntryDto[]>([]);

  /** Counter bumped to read the invoices again. */
  private readonly _reloads = signal<number>(0);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.calendarFilterForm.valueChanges.pipe(map(() => this.calendarFilterForm.getRawValue())),
    { initialValue: this.calendarFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_CALENDAR_FILTERS));

  /** Whether the calendar is about one reseller: what it pays Keus and what it collects from its customers. */
  readonly isReseller = computed(() => this.mode() === 'resellerSchedule');

  /** Whether the user marks the due dates of the customers collected. */
  readonly canManageCharges = computed(() => this._permissions.can(Capability.ManageCustomerCharges));

  /** Days of the grid: whole weeks, Monday first, covering the displayed month. */
  private readonly _gridDays = computed<Date[]>(() => {
    const first = this.currentMonth();
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const leading = (first.getDay() + 6) % 7;
    const cells = Math.ceil((leading + last.getDate()) / 7) * 7;

    return Array.from({ length: cells }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - leading + i));
  });

  /** Due dates read from the backend: the visible weeks. */
  private readonly _range = computed<{ from: string; to: string }>(() => {
    const days = this._gridDays();
    return { from: startOfDay(days[0]), to: endOfDay(days[days.length - 1]) };
  }, { equal: (a, b) => a.from === b.from && a.to === b.to });

  /** Everything the reading depends on. */
  private readonly _query = computed(() => ({
    mode: this.mode(),
    resellerId: this._context.resellerId(),
    range: this._range(),
    filters: this.appliedFilters(),
    reloads: this._reloads(),
  }));

  /** Due dates grouped by their local day. */
  private readonly _byDay = computed(() => {
    const byDay = new Map<string, CoreResponseScheduleEntryDto[]>();
    for (const entry of this.entries()) {
      const key = this._dayKey(new Date(entry.dueDate));
      byDay.set(key, [...(byDay.get(key) ?? []), entry]);
    }
    return byDay;
  });

  /** Weeks of the grid, seven cells each. */
  readonly weeks = computed<CalendarCell[][]>(() => {
    const month = this.currentMonth().getMonth();
    const cells = this._gridDays().map(date => this._cell(date, date.getMonth() === month));

    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  });

  /** Key of the selected day. */
  readonly selectedDayKey = computed(() => this._dayKey(this.selectedDay()));

  /** The selected day, with its due dates. */
  readonly selectedCell = computed(() => this._cell(this.selectedDay(), true));

  /** Label of the displayed month, as «Ottobre 2026». */
  readonly monthLabel = computed(() => this._capitalize(this.currentMonth().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })));

  /** Label of the selected day, as «Giovedì 15 ottobre 2026». */
  readonly selectedDayLabel = computed(() => this._capitalize(
    this.selectedDay().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  ));

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the due dates when the visible weeks, the reseller of the workspace or the applied filters change.
    toObservable(this._query).pipe(
      switchMap(query => this._loadAll(query.mode, query.resellerId, query.range, query.filters).pipe(
        catchError(error => {
          console.error('Error loading the payment schedule:', error);
          return of([]);
        }),
      )),
      takeUntilDestroyed(),
    ).subscribe(entries => this.entries.set(entries));
  }

  /**
   * Reads the invoices again.
   */
  reload(): void {
    this._reloads.update(count => count + 1);
  }

  /**
   * Applies the filters of the form and reads the invoices again.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.calendarFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the invoices again.
   */
  resetFilters(): void {
    this.calendarFilterForm.reset(DEFAULT_CALENDAR_FILTERS);
    this.appliedFilters.set(DEFAULT_CALENDAR_FILTERS);
  }

  /**
   * Shows the month before the displayed one.
   */
  goToPreviousMonth(): void {
    this.currentMonth.update(month => new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }

  /**
   * Shows the month after the displayed one.
   */
  goToNextMonth(): void {
    this.currentMonth.update(month => new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  /**
   * Follows the month picker opening and closing; on opening it shows the year of the displayed month.
   * @param state the new state of the picker.
   */
  onMonthPickerStateChange(state: BrnDialogState): void {
    if (state === 'open') {
      this.pickerYear.set(this.currentMonth().getFullYear());
    }

    this.monthPickerState.set(state);
  }

  /**
   * Shows a month of the year of the picker and closes it.
   * @param month the month, 0 for January.
   */
  selectMonth(month: number): void {
    this.currentMonth.set(new Date(this.pickerYear(), month, 1));
    this.monthPickerState.set('closed');
  }

  /**
   * Tells whether a month of the picker is the displayed one.
   * @param month the month, 0 for January.
   * @returns true for the displayed month.
   */
  isShownMonth(month: number): boolean {
    const shown = this.currentMonth();
    return shown.getFullYear() === this.pickerYear() && shown.getMonth() === month;
  }

  /**
   * Tells whether a month of the picker is the current one.
   * @param month the month, 0 for January.
   * @returns true for the month of today.
   */
  isThisMonth(month: number): boolean {
    const today = new Date();
    return today.getFullYear() === this.pickerYear() && today.getMonth() === month;
  }

  /**
   * Shows the current month and selects today.
   */
  goToToday(): void {
    const today = new Date();

    this.currentMonth.set(this._firstOfMonth(today));
    this.selectedDay.set(today);
  }

  /**
   * Selects a day; a day of another month also shows that month.
   * @param cell the cell of the day.
   */
  selectDay(cell: CalendarCell): void {
    this.selectedDay.set(cell.date);

    if (!cell.inMonth) {
      this.currentMonth.set(this._firstOfMonth(cell.date));
    }
  }

  /**
   * Tells whether a cell is today.
   * @param cell the cell.
   * @returns true for the cell of today.
   */
  isToday(cell: CalendarCell): boolean {
    return cell.dayKey === this._todayKey;
  }

  /**
   * Tells whether an open invoice is past its due date or falls due within a week (UR-RK-153).
   * @param invoice the invoice.
   * @returns the marker, or null.
   */
  dueState(invoice: CoreResponseInvoiceDto): InvoiceDueState | null {
    return invoiceDueState(invoice);
  }

  /**
   * Tells whether a due date of a customer still to collect is past or falls within a week.
   * @param entry the due date.
   * @returns the marker, or null.
   */
  customerDueState(entry: CoreResponseScheduleEntryDto): InvoiceDueState | null {
    return entry.collected ? null : dueStateOf(entry.dueDate);
  }

  /**
   * Returns the address of the page of an item of a customer.
   * @param entry the due date of the item.
   * @returns the route.
   */
  chargeRoute(entry: CoreResponseScheduleEntryDto): string[] {
    return [this._context.basePath(), 'billing', 'schedule', 'charges', entry.charge?.id ?? ''];
  }

  /**
   * Returns the address of the contract of an invoice; a reseller has no contract pages.
   * @param invoice the invoice.
   * @returns the route, or null.
   */
  contractRoute(invoice: CoreResponseInvoiceDto): string[] | null {
    return this.isReseller() ? null : invoiceContractRoute(invoice);
  }

  /**
   * Returns the address of the contract an expected payment comes from; a reseller has no contract pages.
   * @param expected the expected payment.
   * @returns the route, or null.
   */
  expectedRoute(expected: CoreResponseExpectedChargeDto): string[] | null {
    return this.isReseller() ? null : expectedContractRoute(expected);
  }

  /**
   * Builds the cell of a day from the due dates read.
   * @param date the day.
   * @param inMonth whether the day belongs to the displayed month.
   * @returns the cell.
   */
  private _cell(date: Date, inMonth: boolean): CalendarCell {
    const dayKey = this._dayKey(date);
    const entries = this._byDay().get(dayKey) ?? [];

    return {
      date,
      dayKey,
      inMonth,
      entries,
      totalCents: entries.reduce((total, entry) => total + (entry.invoice?.amountCents ?? 0), 0),
      expectedCents: entries.reduce((total, entry) => total + (entry.direction === ScheduleDirection.ToKeus ? entry.expected?.amountCents ?? 0 : 0), 0),
      expectedCustomersCents: entries.reduce((total, entry) => total + (entry.direction === ScheduleDirection.FromCustomer ? entry.expected?.customerCents ?? 0 : 0), 0),
      customersCents: entries.reduce((total, entry) => total + (entry.charge?.amountCents ?? 0), 0),
      late: entries.some(entry => entry.invoice
        ? entry.invoice.status === InvoiceStatus.Unpaid || invoiceDueState(entry.invoice) === 'overdue'
        : !!entry.charge && this.customerDueState(entry) === 'overdue'),
    };
  }

  /**
   * Reads every page of the due dates of the visible weeks: the payments of Keus, recorded and expected, or the schedule
   * of the reseller for a reseller.
   * @param mode which schedule the calendar shows.
   * @param resellerId the reseller whose workspace is open, if any.
   * @param range the due dates to read.
   * @param filters the applied filters.
   * @returns the due dates.
   */
  private _loadAll(
    mode: InvoiceCalendarMode,
    resellerId: string | null,
    range: { from: string; to: string },
    filters: ScheduleCalendarFilterValues,
  ): Observable<CoreResponseScheduleEntryDto[]> {
    // A multiple filter on «Nessuno» matches nothing: the calendar empties without a request.
    if (hasEmptySelection(filters)) return of([]);

    let readPage: (page: PageRequest) => Observable<CoreResponseSchedulePageDto>;
    if (mode === 'schedule') {
      const query: ScheduleFilters = {
        status: orUndefined(filters.status) as ScheduleFilters['status'],
        search: orUndefined(filters.search),
      };
      readPage = page => this._invoicesApiService.listScheduleOfPeriod(range.from, range.to, page, query);
    } else if (resellerId) {
      readPage = page => this._customerChargesApiService.listSchedule(resellerId, range.from, range.to, page, { search: orUndefined(filters.search) });
    } else {
      return of([]);
    }

    return readPage({ limit: PAGE_LIMIT }).pipe(
      expand(page => page.nextCursor ? readPage({ limit: PAGE_LIMIT, cursor: page.nextCursor }) : EMPTY),
      reduce((entries, page) => [...entries, ...page.items], [] as CoreResponseScheduleEntryDto[]),
    );
  }

  /**
   * Returns the first day of the month of a date.
   * @param date the date.
   * @returns the first day of its month.
   */
  private _firstOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Returns the local day key of a date.
   * @param date the date.
   * @returns the key, as YYYY-MM-DD.
   */
  private _dayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Capitalizes the first letter of a label.
   * @param label the label.
   * @returns the label with a capital first letter.
   */
  private _capitalize(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
