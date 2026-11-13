import { Component, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MIXPANEL_HOME_URL } from '../../../../utils/external-links.util';
import { ProductAdoptionSectionComponent } from '../../components/product-adoption-section/product-adoption-section.component';
import { Period } from '../../enums/period.enum';

/**
 * Global product metrics: the adoption of every product on its levers, read from Mixpanel (UR-RK-220, UR-RK-223).
 */
@Component({
  selector: 'rocket-global-product-metrics',
  imports: [...BrnSelectImports, ...HlmButtonImports, ...HlmSelectImports, NgIcon, PageHeaderComponent, ProductAdoptionSectionComponent],
  viewProviders: [provideIcons({ lucideExternalLink })],
  templateUrl: './global-product-metrics.component.html',
  styleUrl: './global-product-metrics.component.css'
})
export class GlobalProductMetricsComponent {
  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Link to Mixpanel: with every product in view there is no single project to open; none in the demo. */
  readonly mixpanelUrl = INTEGRATIONS_ENABLED ? MIXPANEL_HOME_URL : null;

  /** Time mode of the metrics. */
  period = signal<Period>(Period.Monthly);

  /**
   * Handles the time selector change.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onPeriodChange(value: string): void {
    this.period.set(value as Period);
  }
}
