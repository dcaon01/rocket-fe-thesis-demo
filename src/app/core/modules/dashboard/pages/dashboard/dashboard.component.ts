import { Component, computed, inject } from '@angular/core';
import { Capability } from '../../../../enums/capability.enum';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { RevenueSectionComponent } from '../../components/revenue-section/revenue-section.component';
import { UsageSectionComponent } from '../../components/usage-section/usage-section.component';
import { ChannelSplitSectionComponent } from '../../components/channel-split-section/channel-split-section.component';
import { CustomerBaseSectionComponent } from '../../components/customer-base-section/customer-base-section.component';
import { NetworkMapSectionComponent } from '../../components/network-map-section/network-map-section.component';

/**
 * Global dashboard (UR-RK-001): the Fatturato, Clienti, Utenze, Canali and Rete dei rivenditori sections of the whole
 * portfolio, each shown to the profiles allowed.
 */
@Component({
  selector: 'rocket-dashboard',
  imports: [
    PageHeaderComponent,
    RevenueSectionComponent,
    UsageSectionComponent,
    ChannelSplitSectionComponent,
    CustomerBaseSectionComponent,
    NetworkMapSectionComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  /** The permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the current user can see the Fatturato section. */
  canViewRevenue = computed(() => this._permissions.can(Capability.ViewRevenue));

  /** Whether the current user can see the Utenze section. */
  canViewUsage = computed(() => this._permissions.can(Capability.ViewUsage));

  /** Whether the current user can see the Canali section. */
  canViewChannels = computed(() => this._permissions.can(Capability.ViewSalesOrders));

  /** Whether the current user can see the Clienti section. */
  canViewCustomerBase = computed(() => this._permissions.can(Capability.ViewGlobalCustomerBase));

  /** Whether the current user can see the Rete dei rivenditori section. */
  canViewNetworkMap = computed(() => this._permissions.can(Capability.ViewNetworkMap));
}
