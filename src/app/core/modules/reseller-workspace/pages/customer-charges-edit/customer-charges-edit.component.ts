import { Component, computed, inject, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { EMPTY, switchMap } from 'rxjs';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { CustomerChargeKind } from '../../../../enums/customer-charge-kind.enum';
import { CustomerChargesApiService } from '../../../../services/api-services/customer-charges/customer-charges-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { CustomerChargeFormComponent } from '../../../billing/components/customer-charge-form/customer-charge-form.component';

/**
 * Page of an item the reseller of the workspace bills one of its customers: the ones it added by hand change here,
 * the shares of the contracts only show.
 */
@Component({
  selector: 'rocket-customer-charges-edit',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    CustomerChargeFormComponent,
  ],
  templateUrl: './customer-charges-edit.component.html',
})
export class CustomerChargesEditComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Customer charges API service instance. */
  private readonly _customerChargesApiService = inject(CustomerChargesApiService);

  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Reference to the item form. */
  form = viewChild<CustomerChargeFormComponent>('form');

  /** The item to edit. */
  readonly chargeData = toSignal(
    toObservable(this._context.resellerId).pipe(
      switchMap(resellerId => resellerId
        ? this._customerChargesApiService.getCharge(resellerId, this._activatedRoute.snapshot.params['chargeId'])
        : EMPTY),
    ),
  );

  /** Whether the user changes the item: one added by hand, by someone who manages them. */
  readonly canEdit = computed(() => this._permissions.can(Capability.ManageCustomerCharges)
    && !!this.chargeData() && this.chargeData()?.kind !== CustomerChargeKind.Contract);

  /**
   * Saves the changed fields of the item and goes back to the schedule.
   */
  updateCharge(): void {
    const form = this.form();
    const resellerId = this._context.resellerId();
    const charge = this.chargeData();
    if (!form || form.chargeForm.invalid || !form.chargeForm.dirty || !resellerId || !charge) return;

    this._customerChargesApiService.updateCharge(resellerId, charge.id, form.buildUpdateDto()).subscribe({
      next: () => this._router.navigate([this._context.basePath(), 'billing', 'schedule']),
      error: (error) => console.error('Error updating the item:', error),
    });
  }
}
