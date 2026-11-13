import { Component, computed, inject } from '@angular/core';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { RevenueSectionComponent } from '../../../dashboard/components/revenue-section/revenue-section.component';
import { UsageSectionComponent } from '../../../dashboard/components/usage-section/usage-section.component';
import { ChannelSplitSectionComponent } from '../../../dashboard/components/channel-split-section/channel-split-section.component';
import { CustomerBaseSectionComponent } from '../../../dashboard/components/customer-base-section/customer-base-section.component';

/**
 * Dashboard of the product workspace: the indicators of the global dashboard restricted to the product, without the
 * split by product (UR-RK-235). A Keus salesperson reads only the revenue of what it sold.
 */
@Component({
  selector: 'rocket-product-dashboard',
  imports: [PageHeaderComponent, RevenueSectionComponent, CustomerBaseSectionComponent, UsageSectionComponent, ChannelSplitSectionComponent],
  templateUrl: './product-dashboard.component.html',
})
export class ProductDashboardComponent {
  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Product whose workspace is open. */
  readonly productId = this._context.productId;

  /** Whether the user reads the revenue of the product. */
  readonly canViewRevenue = computed(() => this._permissions.can(Capability.ViewProductRevenue));

  /** Whether the user reads the active companies and resellers of the product. */
  readonly canViewCustomerBase = computed(() => this._permissions.can(Capability.ViewCustomerBase));

  /** Whether the user reads the utilities of the product. */
  readonly canViewUsage = computed(() => this._permissions.can(Capability.ViewUsage));

  /** Whether the user reads the licenses of the product by channel. */
  readonly canViewChannels = computed(() => this._permissions.can(Capability.ViewSalesOrders));
}
