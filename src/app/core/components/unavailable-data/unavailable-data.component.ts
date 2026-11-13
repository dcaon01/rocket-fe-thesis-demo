// Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUnplug } from '@ng-icons/lucide';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';

/**
 * Fallback of a chart whose figures come from an external integration, off in the demo: the chart keeps its place
 * and says where the data would come from.
 * Usage: <rocket-unavailable-data source="HubSpot" />
 */
@Component({
  selector: 'rocket-unavailable-data',
  imports: [...HlmEmptyImports, NgIcon],
  providers: [provideIcons({ lucideUnplug })],
  host: { class: 'block size-full' },
  templateUrl: './unavailable-data.component.html',
})
export class UnavailableDataComponent {
  /** Integration the figures come from. */
  source = input.required<string>();
}
