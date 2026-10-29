import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { InvoiceStatus } from '../enums/invoice-status.enum';

/**
 * Directive that applies status-based colors to invoice collection badges.
 * Usage: <span hlmBadge rocketInvoiceStatus [status]="invoice.status">...</span>
 */
@Directive({
  selector: '[rocketInvoiceStatus]'
})
export class InvoiceStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The invoice status value. */
  status = input.required<string | null | undefined>();

  /**
   * Initializes the directive and sets up an effect to apply status colors.
   */
  constructor() {
    effect(() => this._applyStatusColor(this.status()));
  }

  /**
   * Applies the appropriate status color to the host element.
   * @param status the value of the status.
   */
  private _applyStatusColor(status: string | null | undefined): void {
    const el = this._el.nativeElement as HTMLElement;
    Object.values(STATUS_COLORS).forEach(colors => colors.split(' ').forEach(cls => el.classList.remove(cls)));
    const colors = status === InvoiceStatus.Paid ? STATUS_COLORS.positive
      : status === InvoiceStatus.Unpaid ? STATUS_COLORS.negative
      : status === InvoiceStatus.Open ? STATUS_COLORS.warning
      : STATUS_COLORS.neutral;
    colors.split(' ').forEach(cls => el.classList.add(cls));
  }
}
