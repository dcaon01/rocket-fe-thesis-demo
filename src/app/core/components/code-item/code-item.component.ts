import { Component, input } from '@angular/core';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

/**
 * Read-only code (VAT number, SDI, IBAN, ids) under its label, which can be copied.
 * Usage: <rocket-code-item label="Partita IVA" [value]="company.vatNumber" />
 */
@Component({
  selector: 'rocket-code-item',
  imports: [
    ...HlmLabelImports,
    CopyButtonComponent,
  ],
  templateUrl: './code-item.component.html',
  host: { class: 'flex flex-col gap-2 min-w-0' },
})
export class CodeItemComponent {
  /** Label above the value. */
  label = input.required<string>();

  /** Code to show, a dash when missing. */
  value = input<string | null | undefined>();

  /** Whether the code is set in the monospace face. */
  mono = input<boolean>(true);
}
