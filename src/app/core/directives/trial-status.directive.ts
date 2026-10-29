import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { TrialStatus } from '../enums/trial-status.enum';

/**
 * Directive that applies status-based colors to trial badge elements.
 * Usage: <span hlmBadge rocketTrialStatus [status]="trial.status">...</span>
 */
@Directive({
  selector: '[rocketTrialStatus]'
})
export class TrialStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The trial status value. */
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
      case TrialStatus.Active:
        colorClasses = STATUS_COLORS.positive;
        break;
      case TrialStatus.Draft:
        colorClasses = STATUS_COLORS.warning;
        break;
      case TrialStatus.Expired:
        colorClasses = STATUS_COLORS.neutral;
        break;
      case TrialStatus.Cancelled:
        colorClasses = STATUS_COLORS.negative;
        break;
      case TrialStatus.Converted:
        colorClasses = STATUS_COLORS.positive;
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
