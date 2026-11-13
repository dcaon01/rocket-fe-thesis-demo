import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { InvoiceCalendarComponent, InvoiceCalendarMode } from '../invoice-calendar/invoice-calendar.component';
import { InvoiceListComponent } from '../invoice-list/invoice-list.component';
import { ResellerScheduleListComponent } from '../reseller-schedule-list/reseller-schedule-list.component';

/** View of the payment schedule, kept in the `vista` query parameter. */
type ScheduleView = 'lista' | 'calendario';

/**
 * Payment schedule in two tabs, the month calendar and the list (UR-RK-153), shared by the global area and the
 * reseller workspace, where it also holds what the reseller collects from its customers. The open tab stays in the
 * address, so it can be linked.
 */
@Component({
  selector: 'rocket-payment-schedule-tabs',
  imports: [
    ...HlmTabsImports,
    InvoiceCalendarComponent,
    InvoiceListComponent,
    ResellerScheduleListComponent,
    NgTemplateOutlet,
  ],
  templateUrl: './payment-schedule-tabs.component.html',
})
export class PaymentScheduleTabsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Which schedule the tabs show. */
  mode = input.required<InvoiceCalendarMode>();

  /** Reference to the calendar, created when its tab is first opened. */
  calendar = viewChild(InvoiceCalendarComponent);

  /** Reference to the list of Keus, created when its tab is first opened. */
  list = viewChild(InvoiceListComponent);

  /** Reference to the list of the reseller, created when its tab is first opened. */
  resellerList = viewChild(ResellerScheduleListComponent);

  /** Open tab. */
  activeView = signal<ScheduleView>(this._initialView());

  /**
   * Opens a tab and writes it in the address.
   * @param view the tab to open.
   */
  onTabActivated(view: string): void {
    this.activeView.set(view as ScheduleView);
    this._router.navigate([], { relativeTo: this._activatedRoute, queryParams: { vista: view }, replaceUrl: true });
  }

  /**
   * Reads the invoices of the open tab again.
   */
  reload(): void {
    if (this.activeView() === 'calendario') {
      this.calendar()?.reload();
    } else {
      this.list()?.loadInvoices();
      this.resellerList()?.loadSchedule();
    }
  }

  /**
   * Reads the tab to open from the address, the calendar when absent.
   * @returns the tab to open.
   */
  private _initialView(): ScheduleView {
    return this._activatedRoute.snapshot.queryParamMap.get('vista') === 'lista' ? 'lista' : 'calendario';
  }
}
