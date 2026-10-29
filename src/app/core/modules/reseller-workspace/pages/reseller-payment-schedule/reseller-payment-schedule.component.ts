import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideRefreshCw } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { PaymentScheduleTabsComponent } from '../../../billing/components/payment-schedule-tabs/payment-schedule-tabs.component';

/**
 * Page of the schedule of the reseller, by due date, as a list or a month calendar: the invoices of Keus it pays and
 * what it collects from its customers.
 */
@Component({
  selector: 'rocket-reseller-payment-schedule',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    PaymentScheduleTabsComponent,
    NgIcon,
    RouterLink,
  ],
  providers: [provideIcons({ lucidePlus, lucideRefreshCw })],
  templateUrl: './reseller-payment-schedule.component.html',
})
export class ResellerPaymentScheduleComponent {
  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Whether the user adds items for the customers. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageCustomerCharges));
}
