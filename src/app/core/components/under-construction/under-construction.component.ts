import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideConstruction } from '@ng-icons/lucide';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';

/**
 * Placeholder shown on the pages that exist in the menu but are not built yet.
 * Having the route in place from the start means the navigation can be reviewed
 * as a whole, and a click lands on an honest "not yet" instead of a blank page
 * or a redirect that looks like a broken link.
 */
@Component({
  selector: 'rocket-under-construction',
  imports: [NgIcon, ...HlmEmptyImports],
  providers: [provideIcons({ lucideConstruction })],
  templateUrl: './under-construction.component.html',
})
export class UnderConstructionComponent {
  /** Optional note explaining what the page will do once built. */
  note = input<string>('');
}
