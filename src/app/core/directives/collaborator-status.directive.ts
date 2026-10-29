import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';

/**
 * Directive that applies status-based colors to collaborator badge elements.
 * Usage: <span hlmBadge rocketCollaboratorStatus [enabled]="collaborator.enabled">...</span>
 */
@Directive({
  selector: '[rocketCollaboratorStatus]'
})
export class CollaboratorStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** Whether the collaborator is enabled. */
  enabled = input.required<boolean>();

  /**
   * Initializes the directive and sets up an effect to apply status colors.
   */
  constructor() {
    effect(() => {
      this._applyStatusColor(this.enabled());
    });
  }

  /**
   * Applys the appropriate status color to the host element.
   * @param status the value of the status.
   */
  private _applyStatusColor(enabled: boolean): void {
    const el = this._el.nativeElement as HTMLElement;

    // Remove all status colors first
    this._removeAllStatusColors(el);

    // Apply the appropriate color based on enabled state
    const colorClasses = enabled ? STATUS_COLORS.positive : STATUS_COLORS.neutral;

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
