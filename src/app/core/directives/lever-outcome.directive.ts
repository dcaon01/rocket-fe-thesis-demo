import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { LeverOutcome } from '../enums/lever-outcome.enum';

/**
 * Directive that applies outcome-based colors to the badges of the product metrics.
 * Usage: <span hlmBadge rocketLeverOutcome [outcome]="result.outcome">...</span>
 */
@Directive({
  selector: '[rocketLeverOutcome]'
})
export class LeverOutcomeDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The outcome value. */
  outcome = input.required<string | null | undefined>();

  /**
   * Initializes the directive and sets up an effect to apply the outcome colors.
   */
  constructor() {
    effect(() => {
      this._applyOutcomeColor(this.outcome());
    });
  }

  /**
   * Applies the color of the outcome to the host element: the outcomes that judge go from success to destructive,
   * the ones that do not judge stay neutral.
   * @param outcome the outcome.
   */
  private _applyOutcomeColor(outcome: string | null | undefined): void {
    const el = this._el.nativeElement as HTMLElement;

    Object.values(STATUS_COLORS).forEach(colorString => {
      colorString.split(' ').forEach(cls => el.classList.remove(cls));
    });

    let colorClasses: string = STATUS_COLORS.neutral;
    if (outcome === LeverOutcome.Compliant) colorClasses = STATUS_COLORS.positive;
    if (outcome === LeverOutcome.AtRisk) colorClasses = STATUS_COLORS.warning;
    if (outcome === LeverOutcome.Failing) colorClasses = STATUS_COLORS.negative;
    colorClasses.split(' ').forEach(cls => el.classList.add(cls));
  }
}
