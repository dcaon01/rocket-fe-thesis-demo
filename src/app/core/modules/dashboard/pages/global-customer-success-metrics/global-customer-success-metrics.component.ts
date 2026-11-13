import { Component, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { environment } from '../../../../../../environments/environment';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { intercomInboxUrl } from '../../../../utils/external-links.util';
import { CustomerSuccessSectionComponent } from '../../components/customer-success-section/customer-success-section.component';
import { Period } from '../../enums/period.enum';

/**
 * Global customer success metrics: churn, activation and the customers to follow up of every product (UR-RK-220).
 */
@Component({
  selector: 'rocket-global-customer-success-metrics',
  imports: [...BrnSelectImports, ...HlmButtonImports, ...HlmSelectImports, NgIcon, PageHeaderComponent, CustomerSuccessSectionComponent],
  viewProviders: [provideIcons({ lucideExternalLink })],
  templateUrl: './global-customer-success-metrics.component.html',
  styleUrl: './global-customer-success-metrics.component.css'
})
export class GlobalCustomerSuccessMetricsComponent {
  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Link to the Intercom inbox, whose workspace is shared by every product; none in the demo. */
  readonly intercomUrl = INTEGRATIONS_ENABLED ? intercomInboxUrl(environment.intercomAppId) : null;

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
