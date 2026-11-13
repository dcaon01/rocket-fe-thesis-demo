import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';

/**
 * Directive that colors the badge of an integration: positive once configured, warning while still to configure.
 * Usage: <span hlmBadge rocketIntegrationStatus [configured]="isConfigured">...</span>
 */
@Directive({
  selector: '[rocketIntegrationStatus]'
})
export class IntegrationStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** Whether the integration is configured. */
  configured = input.required<boolean>();

  /**
   * Initializes the directive and sets up an effect to apply the status color.
   */
  constructor() {
    effect(() => {
      this._applyStatusColor(this.configured());
    });
  }

  /**
   * Applies the color of the integration status to the host element.
   * @param configured whether the integration is configured.
   */
  private _applyStatusColor(configured: boolean): void {
    const el = this._el.nativeElement as HTMLElement;

    Object.values(STATUS_COLORS).forEach(colorString => {
      colorString.split(' ').forEach(cls => el.classList.remove(cls));
    });

    const colorClasses = configured ? STATUS_COLORS.positive : STATUS_COLORS.warning;
    colorClasses.split(' ').forEach(cls => el.classList.add(cls));
  }
}
