import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRefreshCw } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { PaymentScheduleTabsComponent } from '../../components/payment-schedule-tabs/payment-schedule-tabs.component';

/**
 * Page of the invoices still to collect, by due date, as a list or a month calendar.
 */
@Component({
  selector: 'rocket-payment-schedule',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    PaymentScheduleTabsComponent,
    NgIcon,
  ],
  providers: [provideIcons({ lucideRefreshCw })],
  templateUrl: './payment-schedule.component.html',
})
export class PaymentScheduleComponent {}
