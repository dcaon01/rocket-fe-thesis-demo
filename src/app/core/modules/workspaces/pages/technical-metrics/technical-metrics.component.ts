import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { Period } from '../../../dashboard/enums/period.enum';
import { TechnicalMetricsSectionComponent } from '../../../metrics/components/technical-metrics-section/technical-metrics-section.component';

/**
 * Technical metrics of the product workspace: the indicators of the global page restricted to the product (UR-RK-225).
 */
@Component({
  selector: 'rocket-technical-metrics',
  imports: [...BrnSelectImports, ...HlmButtonImports, ...HlmSelectImports, NgIcon, PageHeaderComponent, TechnicalMetricsSectionComponent],
  viewProviders: [provideIcons({ lucideExternalLink })],
  templateUrl: './technical-metrics.component.html',
})
export class TechnicalMetricsComponent {
  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Product whose workspace is open. */
  readonly productId = this._context.productId;

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
