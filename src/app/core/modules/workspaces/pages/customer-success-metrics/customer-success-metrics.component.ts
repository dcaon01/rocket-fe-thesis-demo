import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { environment } from '../../../../../../environments/environment';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { intercomInboxUrl } from '../../../../utils/external-links.util';
import { CustomerSuccessSectionComponent } from '../../../dashboard/components/customer-success-section/customer-success-section.component';
import { Period } from '../../../dashboard/enums/period.enum';

/**
 * Customer success metrics of the product workspace: the indicators of the global page restricted to the product,
 * with the terminations split by seller instead of by product (UR-RK-221).
 */
@Component({
  selector: 'rocket-customer-success-metrics',
  imports: [...BrnSelectImports, ...HlmButtonImports, ...HlmSelectImports, NgIcon, PageHeaderComponent, CustomerSuccessSectionComponent],
  viewProviders: [provideIcons({ lucideExternalLink })],
  templateUrl: './customer-success-metrics.component.html',
  styleUrl: './customer-success-metrics.component.css'
})
export class CustomerSuccessMetricsComponent {
  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Product whose workspace is open. */
  readonly productId = this._context.productId;

  /** Link to the Intercom inbox, absent when the product has no brand on Intercom. */
  readonly intercomUrl = computed(() => {
    const product = this._productsCacheService.products().find(p => p.id === this.productId());
    return product?.intercomBrand ? intercomInboxUrl(environment.intercomAppId) : null;
  });

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
