import { Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { ResellerContractsApiService } from '../../../../services/api-services/reseller-contracts/reseller-contracts-api.service';
import { ResellerContractFormComponent } from '../../components/reseller-contract-form/reseller-contract-form.component';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';

/**
 * Page that opens a contract with a reseller from its partner tier.
 */
@Component({
  selector: 'rocket-reseller-contracts-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    ResellerContractFormComponent,
    FormToolbarComponent,
  ],
  templateUrl: './reseller-contracts-create.component.html',
  styleUrl: './reseller-contracts-create.component.css'
})
export class ResellerContractsCreateComponent {
  /** Router instance. */
  private readonly _router = inject(Router);
  /** Reseller contracts API service instance. */
  private readonly _resellerContractsService = inject(ResellerContractsApiService);

  /** Reference to the reseller contract form. */
  form = viewChild<ResellerContractFormComponent>('form');

  /**
   * Opens the contract as a draft and moves to its page.
   */
  createContract(): void {
    const form = this.form();
    const resellerId = form?.contractForm.getRawValue().resellerId;
    if (!form || form.contractForm.invalid || !resellerId) return;

    this._resellerContractsService.createContract(resellerId, form.buildCreateDto()).subscribe({
      next: (contract) => this._router.navigate(['/billing/reseller-contracts', contract.resellerId, contract.id]),
      error: (error) => console.error('Error opening the reseller contract:', error)
    });
  }
}
