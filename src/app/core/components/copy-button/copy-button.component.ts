import { Component, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ToasterService } from '../../services/toaster/toaster.service';

/**
 * Icon button that copies a read-only value to the clipboard.
 * Usage: <rocket-copy-button [value]="company.vatNumber" />
 */
@Component({
  selector: 'rocket-copy-button',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    NgIcon,
  ],
  providers: [provideIcons({ lucideCopy })],
  templateUrl: './copy-button.component.html',
})
export class CopyButtonComponent {
  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Value to copy. */
  value = input.required<string>();

  /**
   * Copies the value to the clipboard.
   */
  copy(): void {
    navigator.clipboard.writeText(this.value());
    this._toasterService.showSuccess('Copiato negli appunti');
  }
}
