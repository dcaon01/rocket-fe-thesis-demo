import { Directive, ElementRef, inject, input, effect } from '@angular/core';
import { STATUS_COLORS } from '../constants/status-colors';
import { ContractStatus } from '../enums/contract-status.enum';
import { ResellerContractStatus } from '../enums/reseller-contract-status.enum';

/**
 * Directive that applies status-based colors to contract and reseller contract badge elements.
 * Usage: <span hlmBadge rocketContractStatus [status]="contract.status">...</span>
 */
@Directive({
  selector: '[rocketContractStatus]'
})
export class ContractStatusDirective {
  /** Reference to the host element. */
  private readonly _el = inject(ElementRef);

  /** The contract status value. */
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
      case ContractStatus.Active:
        colorClasses = STATUS_COLORS.positive;
        break;
      case ResellerContractStatus.Draft:
      case ResellerContractStatus.Signed:
      case ResellerContractStatus.EndedAtRenewal:
      case ContractStatus.Terminating:
        colorClasses = STATUS_COLORS.warning;
        break;
      case ResellerContractStatus.Refused:
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
