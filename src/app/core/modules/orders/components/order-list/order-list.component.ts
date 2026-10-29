import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideCheck, lucideCircleCheck, lucideEye, lucideFileText, lucideInbox, lucideLandmark, lucidePlus, lucidePuzzle, lucideRefreshCw, lucideSearch, lucideSend, lucideTrash2 } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize, map, of, switchMap } from 'rxjs';
import { CoreResponseOrderDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { DateRangeFilterComponent } from '../../../../components/date-range-filter/date-range-filter.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { OrderStatusDirective } from '../../../../directives/order-status.directive';
import { AppArea } from '../../../../enums/app-area.enum';
import { Capability } from '../../../../enums/capability.enum';
import { OrderStatus } from '../../../../enums/order-status.enum';
import { SalesChannel } from '../../../../enums/sales-channel.enum';
import { OrderStatusPipe } from '../../../../pipes/order-status/order-status.pipe';
import { ResellerOwnerPipe } from '../../../../pipes/reseller-owner/reseller-owner.pipe';
import { SalesChannelPipe } from '../../../../pipes/sales-channel/sales-channel.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { DateRange } from '../../../../interfaces/date-range.interface';
import { OrdersApiService, OrdersFilters } from '../../../../services/api-services/orders/orders-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ORDER_STEPS, OrderActionsService, OrderStepKind } from '../../../../services/order-actions/order-actions.service';
import { OrderActionDialogComponent } from '../order-action-dialog/order-action-dialog.component';
import { endOfDay, hasEmptySelection, orUndefined, sameFilters, startOfDay } from '../../../../utils/filters.util';
import { FilterOrdersForm } from '../../interfaces/filter-orders-form.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { OrderLineStatus } from '../../../../enums/order-line-status.enum';
import { OrderLineStatusPipe } from '../../../../pipes/order-line-status/order-line-status.pipe';

/** Values of the order filters. */
type OrderFilterValues = ReturnType<FormGroup<FilterOrdersForm>['getRawValue']>;

/** Final statuses: the queue opens on every other one. */
const FINAL_STATUSES: string[] = [OrderStatus.Closed, OrderStatus.Refused, OrderStatus.Cancelled];

/** Filters the queue opens with, and that the reset brings back. */
const DEFAULT_ORDER_FILTERS: OrderFilterValues = {
  search: null,
  status: Object.values(OrderStatus).filter(status => !FINAL_STATUSES.includes(status)),
  lineStatus: null,
  channel: null,
  period: { from: null, to: null },
};

/** Statuses in which an order can be deleted, as the backend allows. */
const DELETABLE_STATUSES: string[] = [OrderStatus.Draft, OrderStatus.Refused, OrderStatus.Cancelled];

/**
 * Queue of the orders, shared by the global area and the reseller workspace.
 * It opens on the open orders; in a reseller workspace it lists the orders of that reseller only.
 */
@Component({
  selector: 'rocket-order-list',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    DateRangeFilterComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    OrderActionDialogComponent,
    OrderStatusDirective,
    NgIcon,
    ReactiveFormsModule,
    DatePipe,
    OrderStatusPipe,
    ResellerOwnerPipe,
    SalesChannelPipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideSearch, lucideInbox,
      lucideEye,
      lucidePlus,
      lucideRefreshCw,
      lucideTrash2,
      lucidePuzzle,
      lucideCheck,
      lucideCircleCheck,
      lucideFileText,
      lucideLandmark,
      lucideSend,
    })
  ],
  templateUrl: './order-list.component.html',
})
export class OrderListComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Orders API service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Pages of the orders. */
  readonly pager = inject<CursorPaginationService<CoreResponseOrderDto>>(CursorPaginationService);

  /** Description shown under the page title. */
  description = input<string>('');

  /** Order statuses, for the template. */
  readonly OrderStatus = OrderStatus;

  /** Order statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(OrderStatus).map(status => ({ value: status, label: new OrderStatusPipe().transform(status) }));

  /** Line statuses offered by the line filter. */
  lineStatusOptions: ComboboxOption[] = Object.values(OrderLineStatus).map(status => ({ value: status, label: new OrderLineStatusPipe().transform(status) }));

  /** Sales channels offered by the channel filter. */
  channelOptions: ComboboxOption[] = Object.values(SalesChannel).map(channel => ({ value: channel, label: new SalesChannelPipe().transform(channel) }));

  /** Form group for filtering the orders. */
  ordersFilterForm = new FormGroup<FilterOrdersForm>({
    search: new FormControl<string | null>(DEFAULT_ORDER_FILTERS.search),
    status: new FormControl<string[] | null>(DEFAULT_ORDER_FILTERS.status),
    lineStatus: new FormControl<string[] | null>(DEFAULT_ORDER_FILTERS.lineStatus),
    channel: new FormControl<string[] | null>(DEFAULT_ORDER_FILTERS.channel),
    period: new FormControl<DateRange | null>(DEFAULT_ORDER_FILTERS.period),
  });

  /** Filters applied to the list. */
  appliedFilters = signal<OrderFilterValues>(DEFAULT_ORDER_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.ordersFilterForm.valueChanges.pipe(map(() => this.ordersFilterForm.getRawValue())),
    { initialValue: this.ordersFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_ORDER_FILTERS));

  /** Whether the viewer works at a reseller: its orders are all of the indirect channel, so the channel stays hidden. */
  readonly isReseller = this._permissions.isReseller;

  /** Whether the list is shown inside a reseller workspace. */
  readonly isResellerWorkspace = computed(() => this._context.area() === AppArea.ResellerWorkspace);

  /** Whether the user can open a new order request. */
  readonly canCreate = computed(() => this._permissions.can(Capability.CreateOrders));

  /** Order actions service instance. */
  private readonly _orderActions = inject(OrderActionsService);

  /** Label and icon of each step of an order, for the buttons of the row. */
  readonly orderSteps = ORDER_STEPS;

  /** Action dialog reference, shared with the order page. */
  actionDialog = viewChild<OrderActionDialogComponent>('actionDialog');

  /** Whether the user can delete draft orders. */
  readonly canDeleteOrders = computed(() => this._permissions.can(Capability.DeleteOrders));

  /** Reference to the delete dialog. */
  deleteDialog = viewChild<BrnDialog>('deleteDialog');

  /** Order waiting for the delete confirmation. */
  selectedOrder = signal<CoreResponseOrderDto | null>(null);

  /** Whether the deletion is running. */
  isLoading = signal<boolean>(false);

  /** Whether the user sees which reseller manages each order. */
  readonly canViewOwnership = computed(() => this._permissions.can(Capability.ViewResellerOwnership));

  /** Code of the reseller whose workspace is open, to list its orders only. */
  private readonly _resellerCode = toSignal(
    toObservable(this._context.resellerId).pipe(
      switchMap(resellerId => resellerId
        ? this._resellersApiService.getReseller(resellerId).pipe(map(reseller => reseller.code))
        : of(null)),
    ),
    { initialValue: null },
  );

  /**
   * Constructor of the component.
   */
  constructor() {
    // Read the first page whenever the applied filters or the reseller of the workspace change.
    effect(() => {
      const filters = this.appliedFilters();
      const resellerCode = this._resellerCode();
      if (this.isResellerWorkspace() && !resellerCode) return;

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._ordersApiService.listOrders(page, this._toQuery(filters, resellerCode))));
    });
  }

  /**
   * Whether an order can be deleted from the list: a draft, or an order refused or cancelled before the confirmation.
   * @param order the order.
   * @returns true when the trash icon is shown.
   */
  canDelete(order: CoreResponseOrderDto): boolean {
    return this.canDeleteOrders() && DELETABLE_STATUSES.includes(order.status);
  }

  /**
   * Opens the delete dialog for an order.
   * @param order the order to delete.
   */
  openDeleteDialog(order: CoreResponseOrderDto): void {
    this.selectedOrder.set(order);
    this.deleteDialog()?.open();
  }

  /**
   * Closes the delete dialog.
   */
  closeDeleteDialog(): void {
    this.selectedOrder.set(null);
    this.deleteDialog()?.close();
  }

  /**
   * Deletes the selected draft and reloads the page.
   */
  deleteOrder(): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.isLoading.set(true);
    this._ordersApiService.deleteOrder(order.id).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.closeDeleteDialog();
        this.pager.reload();
      })
    ).subscribe();
  }

  /**
   * Returns the forward steps the user may run on an order of the row.
   * @param order the order.
   * @returns the steps.
   */
  stepsOf(order: CoreResponseOrderDto): OrderStepKind[] {
    return this._orderActions.rowSteps(order);
  }

  /**
   * Opens the dialog of a step on an order of the row.
   * @param kind the step.
   * @param order the order.
   */
  openStep(kind: OrderStepKind, order: CoreResponseOrderDto): void {
    this.actionDialog()?.open(kind, order);
  }

  /**
   * Reads the current page again.
   */
  loadOrders(): void {
    this.pager.reload();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.ordersFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.ordersFilterForm.reset(DEFAULT_ORDER_FILTERS);
    this.appliedFilters.set(DEFAULT_ORDER_FILTERS);
  }

  /**
   * Navigates to the order request creation page.
   */
  goToCreateOrder(): void {
    this._router.navigate(['create'], { relativeTo: this._activatedRoute });
  }

  /**
   * Navigates to the order page.
   * @param orderId the identifier of the order.
   */
  goToOrder(orderId: string): void {
    this._router.navigate([orderId], { relativeTo: this._activatedRoute });
  }

  /**
   * Turns the filter values into the query of the listing.
   * @param filters the filter values.
   * @param resellerCode the reseller whose workspace is open, if any.
   * @returns the query.
   */
  private _toQuery(filters: OrderFilterValues, resellerCode: string | null): OrdersFilters {
    return {
      status: orUndefined(filters.status) as OrdersFilters['status'],
      lineStatus: orUndefined(filters.lineStatus) as OrdersFilters['lineStatus'],
      channel: orUndefined(filters.channel) as OrdersFilters['channel'],
      search: orUndefined(filters.search),
      from: startOfDay(filters.period?.from),
      to: endOfDay(filters.period?.to),
      resellerCode: resellerCode ?? undefined,
    };
  }
}
