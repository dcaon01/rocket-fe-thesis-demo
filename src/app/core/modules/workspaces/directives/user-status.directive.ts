import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../../../constants/status-colors';
import { UserStatus } from '../../../enums/user-status.enum';

/**
 * Directive that applies status-based colors to user badge elements.
 * Usage: <span hlmBadge rocketUserStatus [status]="user.status">...</span>
 */
@Directive({
  selector: '[rocketUserStatus]'
})
export class UserStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The user status value. */
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
      case UserStatus.Active:
        colorClasses = STATUS_COLORS.positive;
        break;
      case UserStatus.Requested:
        colorClasses = STATUS_COLORS.warning;
        break;
      case UserStatus.Cancelled:
      case UserStatus.Deleted:
        colorClasses = STATUS_COLORS.neutral;
        break;
      default:
        colorClasses = STATUS_COLORS.negative;
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
