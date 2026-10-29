import { Component, computed, inject } from '@angular/core';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ResellerBillingSectionComponent } from '../../../dashboard/components/reseller-billing-section/reseller-billing-section.component';
import { ResellerOverviewSectionComponent } from '../../../dashboard/components/reseller-overview-section/reseller-overview-section.component';
import { ResellerRevenueSectionComponent } from '../../../dashboard/components/reseller-revenue-section/reseller-revenue-section.component';
import { ResellerWorklistSectionComponent } from '../../../dashboard/components/reseller-worklist-section/reseller-worklist-section.component';
import { UsageSectionComponent } from '../../../dashboard/components/usage-section/usage-section.component';

/**
 * Dashboard of the reseller workspace (UR-RK-339), for its profiles and the Keus collaborators that follow it: each
 * section shows only to the profiles its endpoint admits. The back office sees no revenue, the reseller salesperson
 * only what comes from its orders.
 */
@Component({
  selector: 'rocket-reseller-dashboard',
  imports: [
    PageHeaderComponent,
    ResellerRevenueSectionComponent,
    ResellerOverviewSectionComponent,
    ResellerWorklistSectionComponent,
    UsageSectionComponent,
    ResellerBillingSectionComponent,
  ],
  templateUrl: './reseller-dashboard.component.html',
})
export class ResellerDashboardComponent {
  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Reseller whose workspace is open. */
  readonly resellerId = this._context.resellerId;

  /** Whether the user reads the revenue of the reseller. */
  readonly canViewRevenue = computed(() => this._permissions.can(Capability.ViewResellerRevenue));

  /** Whether the user reads the licenses, customers and worklist of the reseller. */
  readonly canViewOverview = computed(() => this._permissions.can(Capability.ViewResellerOverview));

  /** Whether the user reads the utilities of the reseller. */
  readonly canViewUsage = computed(() => this._permissions.can(Capability.ViewResellerUsage));

  /** Whether the user reads the economic position of the reseller towards Keus. */
  readonly canViewBilling = computed(() => this._permissions.can(Capability.ViewResellerBilling));
}
