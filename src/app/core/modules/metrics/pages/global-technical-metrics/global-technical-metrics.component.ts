import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { Period } from '../../../dashboard/enums/period.enum';
import { TechnicalMetricsSectionComponent } from '../../components/technical-metrics-section/technical-metrics-section.component';

/**
 * Global technical metrics: errors, alerts, availability and latency of every product (UR-RK-225).
 */
@Component({
  selector: 'rocket-global-technical-metrics',
  imports: [...BrnSelectImports, ...HlmButtonImports, ...HlmSelectImports, NgIcon, PageHeaderComponent, TechnicalMetricsSectionComponent],
  viewProviders: [provideIcons({ lucideExternalLink })],
  templateUrl: './global-technical-metrics.component.html',
})
export class GlobalTechnicalMetricsComponent {
  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Time mode of the metrics. */
  period = signal<Period>(Period.Monthly);

  /** Link to the issues on Sentry, which the section reads. */
  sentryUrl = signal<string | null>(null);

  /** Whether the user can read the technical metrics. */
  readonly canViewTechnicalMetrics = computed(() => this._permissions.can(Capability.ViewTechnicalMetrics));

  /**
   * Handles the time selector change.
   * @param value the selected time mode ('MONTHLY' or 'ANNUAL').
   */
  onPeriodChange(value: string): void {
    this.period.set(value as Period);
  }
}
