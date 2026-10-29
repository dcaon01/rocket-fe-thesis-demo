import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../../../constants/status-colors';
import { TenantStatus } from '../../../enums/tenant-status.enum';

/**
 * Directive that applies status-based colors to tenant badge elements.
 * Usage: <span hlmBadge rocketTenantStatus [status]="tenant.status">...</span>
 */
@Directive({
  selector: '[rocketTenantStatus]'
})
export class TenantStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The tenant status value. */
  status = input.required<string | null | undefined>();

  /**
   * Initializes the directive and sets up an effect to apply status colors.
   */
  constructor() {
    effect(() => {
      this._applyStatusColor(this.status());
    });
  }

  /**
   * Applys the appropriate status color to the host element.
   * @param status the value of the status.
   */
  private _applyStatusColor(status: string | null | undefined): void {
    const el = this._el.nativeElement as HTMLElement;

    // Remove all status colors first
    this._removeAllStatusColors(el);

    // Apply the appropriate color based on status
    let colorClasses: string;
    switch (status) {
      case TenantStatus.Active:
        colorClasses = STATUS_COLORS.positive;
        break;
      case TenantStatus.Requested:
        colorClasses = STATUS_COLORS.warning;
        break;
      case TenantStatus.Inactive:
        colorClasses = STATUS_COLORS.negative;
        break;
      default:
        colorClasses = STATUS_COLORS.neutral;
        break;
    }

    colorClasses.split(' ').forEach(cls => el.classList.add(cls));
  }

  /**
   * Removes all status color classes from the given element.
   * @param el the html element to remove the status color from.
   */
  private _removeAllStatusColors(el: HTMLElement): void {
    Object.values(STATUS_COLORS).forEach(colorString => {
      colorString.split(' ').forEach(cls => el.classList.remove(cls));
    });
  }
}
