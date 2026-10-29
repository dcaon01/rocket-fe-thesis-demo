import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { CustomizationStatus } from '../enums/customization-status.enum';

/**
 * Directive that applies status-based colors to customization badge elements.
 * Usage: <span hlmBadge rocketCustomizationStatus [status]="customization.status">...</span>
 */
@Directive({
  selector: '[rocketCustomizationStatus]'
})
export class CustomizationStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The customization status value. */
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
   * Applies the appropriate status color to the host element.
   * @param status the value of the status.
   */
  private _applyStatusColor(status: string | null | undefined): void {
    const el = this._el.nativeElement as HTMLElement;

    this._removeAllStatusColors(el);

    let colorClasses: string;
    switch (status) {
      case CustomizationStatus.Requested:
        colorClasses = STATUS_COLORS.warning;
        break;
      case CustomizationStatus.Quoted:
        colorClasses = STATUS_COLORS.positive;
        break;
      case CustomizationStatus.Refused:
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
