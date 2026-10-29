import { Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { CustomerChargesApiService } from '../../../../services/api-services/customer-charges/customer-charges-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { CustomerChargeFormComponent } from '../../../billing/components/customer-charge-form/customer-charge-form.component';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

/**
 * Page that adds an item the reseller of the workspace bills one of its customers, then goes back to its schedule.
 */
@Component({
  selector: 'rocket-customer-charges-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    CustomerChargeFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './customer-charges-create.component.html',
})
export class CustomerChargesCreateComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Customer charges API service instance. */
  private readonly _customerChargesApiService = inject(CustomerChargesApiService);

  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Reference to the item form. */
  form = viewChild<CustomerChargeFormComponent>('form');

  /**
   * Adds the item and goes back to the schedule.
   */
  createCharge(): void {
    const form = this.form();
    const resellerId = this._context.resellerId();
    if (!form || form.chargeForm.invalid || !resellerId) return;

    this._customerChargesApiService.createCharge(resellerId, form.buildCreateDto()).subscribe({
      next: () => this._router.navigate([this._context.basePath(), 'billing', 'schedule']),
      error: (error) => console.error('Error adding the item:', error),
    });
  }
}
