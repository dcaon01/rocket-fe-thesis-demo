import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRefreshCw } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ResellerScheduleListComponent } from '../../../billing/components/reseller-schedule-list/reseller-schedule-list.component';

/**
 * Page of the invoices of the reseller whose workspace is open, latest due date first: the invoices of Keus it pays,
 * going out, and the due dates of its customers already collected, coming in.
 */
@Component({
  selector: 'rocket-reseller-invoices',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    ResellerScheduleListComponent,
    NgIcon,
  ],
  providers: [provideIcons({ lucideRefreshCw })],
  templateUrl: './reseller-invoices.component.html',
})
export class ResellerInvoicesComponent {
  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;
}
