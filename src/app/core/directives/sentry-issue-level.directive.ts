import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { SentryIssueLevel } from '../enums/sentry-issue-level.enum';

/**
 * Directive that applies level-based colors to the badges of the Sentry issues.
 * Usage: <span hlmBadge rocketSentryIssueLevel [level]="issue.level">...</span>
 */
@Directive({
  selector: '[rocketSentryIssueLevel]'
})
export class SentryIssueLevelDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The issue level value. */
  level = input.required<string | null | undefined>();

  /**
   * Initializes the directive and sets up an effect to apply the level colors.
   */
  constructor() {
    effect(() => {
      this._applyLevelColor(this.level());
    });
  }

  /**
   * Applies the color of the level to the host element: fatal and error issues are negative, a warning is a warning,
   * the information and the debug ones are neutral.
   * @param level the issue level.
   */
  private _applyLevelColor(level: string | null | undefined): void {
    const el = this._el.nativeElement as HTMLElement;

    Object.values(STATUS_COLORS).forEach(colorString => {
      colorString.split(' ').forEach(cls => el.classList.remove(cls));
    });

    const negatives: string[] = [SentryIssueLevel.Fatal, SentryIssueLevel.Error];
    const colorClasses = level && negatives.includes(level)
      ? STATUS_COLORS.negative
      : level === SentryIssueLevel.Warning ? STATUS_COLORS.warning : STATUS_COLORS.neutral;
    colorClasses.split(' ').forEach(cls => el.classList.add(cls));
  }
}
