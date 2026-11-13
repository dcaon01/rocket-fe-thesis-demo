import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail, lucidePhone } from '@ng-icons/lucide';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

/**
 * Read-only contact detail: icon tile, label and value, which can be copied.
 * Usage: <rocket-contact-item icon="lucideMail" label="Email" [value]="company.email" />
 */
@Component({
  selector: 'rocket-contact-item',
  imports: [
    ...HlmLabelImports,
    NgIcon,
    CopyButtonComponent,
  ],
  providers: [provideIcons({ lucideMail, lucidePhone })],
  templateUrl: './contact-item.component.html',
  host: { class: 'flex items-center gap-3 min-w-0' },
})
export class ContactItemComponent {
  /** Lucide icon of the tile. */
  icon = input.required<string>();

  /** Label above the value. */
  label = input.required<string>();

  /** Contact value, a dash when missing. */
  value = input<string | null | undefined>();
}
