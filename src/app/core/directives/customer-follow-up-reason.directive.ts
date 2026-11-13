import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { CustomerFollowUpReason } from '../enums/customer-follow-up-reason.enum';

/**
 * Directive that applies reason-based colors to the badges of the customers to follow up.
 * Usage: <span hlmBadge rocketCustomerFollowUpReason [reason]="followUp.reason">...</span>
 */
@Directive({
  selector: '[rocketCustomerFollowUpReason]'
})
export class CustomerFollowUpReasonDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The follow-up reason value. */
  reason = input.required<string | null | undefined>();

  /**
   * Initializes the directive and sets up an effect to apply the reason colors.
   */
  constructor() {
    effect(() => {
      this._applyReasonColor(this.reason());
    });
  }

  /**
   * Applies the color of the reason to the host element: a customer that never logged in or uses the product little
   * is a warning, a contract ending or a suspended access is a loss in the making.
   * @param reason the follow-up reason.
   */
  private _applyReasonColor(reason: string | null | undefined): void {
    const el = this._el.nativeElement as HTMLElement;

    Object.values(STATUS_COLORS).forEach(colorString => {
      colorString.split(' ').forEach(cls => el.classList.remove(cls));
    });

    const warnings: string[] = [CustomerFollowUpReason.NeverActivated, CustomerFollowUpReason.LowUsage];
    const colorClasses = reason && warnings.includes(reason) ? STATUS_COLORS.warning : STATUS_COLORS.negative;
    colorClasses.split(' ').forEach(cls => el.classList.add(cls));
  }
}
