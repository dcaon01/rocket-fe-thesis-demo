import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { TemplateStatus } from '../enums/template-status.enum';

/**
 * Directive that applies status-based colors to template badge elements.
 * Usage: <span hlmBadge rocketTemplateStatus [status]="template.status">...</span>
 */
@Directive({
  selector: '[rocketTemplateStatus]'
})
export class TemplateStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The template status value. */
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
      case TemplateStatus.Draft:
        colorClasses = STATUS_COLORS.warning;
        break;
      case TemplateStatus.Published:
        colorClasses = STATUS_COLORS.positive;
        break;
      case TemplateStatus.Withdrawn:
        colorClasses = STATUS_COLORS.neutral;
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
