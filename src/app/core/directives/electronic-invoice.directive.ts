import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { InvoiceDocumentStatus } from '../enums/invoice-document-status.enum';

/**
 * Directive that colors the badge of the electronic invoice of an invoice: the draft at Sibill closes the work of
 * Rocket, delivered is positive, refused, discarded or uncertain asks for an operator.
 * Usage: <span hlmBadge rocketElectronicInvoice [status]="invoice.documentStatus">...</span>
 */
@Directive({
  selector: '[rocketElectronicInvoice]'
})
export class ElectronicInvoiceDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The state of the electronic invoice. */
  status = input.required<string | null | undefined>();

  /**
   * Initializes the directive and sets up an effect to apply the colors.
   */
  constructor() {
    effect(() => this._applyStatusColor(this.status()));
  }

  /**
   * Applies the color of the state of the electronic invoice to the host element.
   * @param status the value of the state.
   */
  private _applyStatusColor(status: string | null | undefined): void {
    const el = this._el.nativeElement as HTMLElement;
    Object.values(STATUS_COLORS).forEach(colors => colors.split(' ').forEach(cls => el.classList.remove(cls)));

    colors(status).split(' ').forEach(cls => el.classList.add(cls));
  }
}

/**
 * Picks the colors of the state of an electronic invoice.
 * @param status the value of the state.
 * @returns the color classes.
 */
function colors(status: string | null | undefined): string {
  switch (status) {
    case InvoiceDocumentStatus.Delivered:
    case InvoiceDocumentStatus.NotDelivered:
      return STATUS_COLORS.positive;
    case InvoiceDocumentStatus.Failed:
    case InvoiceDocumentStatus.Uncertain:
    case InvoiceDocumentStatus.Discarded:
    case InvoiceDocumentStatus.Refused:
      return STATUS_COLORS.negative;
    case InvoiceDocumentStatus.ToIssue:
    case InvoiceDocumentStatus.Issuing:
    case InvoiceDocumentStatus.Sent:
      return STATUS_COLORS.warning;
    default:
      return STATUS_COLORS.neutral;
  }
}
