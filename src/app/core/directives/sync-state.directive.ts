import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { SyncState } from '../enums/sync-state.enum';

/**
 * Directive that applies state-based colors to synchronisation state badge elements.
 * Usage: <span hlmBadge rocketSyncState [state]="value">...</span>
 */
@Directive({
  selector: '[rocketSyncState]'
})
export class SyncStateDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The state value. */
  state = input.required<string | null | undefined>();

  /**
   * Initializes the directive and sets up an effect to apply state colors.
   */
  constructor() {
    effect(() => {
      this._applyStateColor(this.state());
    });
  }

  /**
   * Applies the appropriate state color to the host element.
   * @param state the value of the state.
   */
  private _applyStateColor(state: string | null | undefined): void {
    const el = this._el.nativeElement as HTMLElement;
    this._removeAllStatusColors(el);

    let colorClasses: string;
    switch (state) {
      case SyncState.InSync:
        colorClasses = STATUS_COLORS.positive;
        break;
      case SyncState.Pending:
        colorClasses = STATUS_COLORS.warning;
        break;
      case SyncState.Failed:
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
