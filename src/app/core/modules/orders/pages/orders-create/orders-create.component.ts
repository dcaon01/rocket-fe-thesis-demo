import { Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CoreCreateOrderDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';
import { OrdersApiService } from '../../../../services/api-services/orders/orders-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { OrderFormComponent } from '../../components/order-form/order-form.component';

/**
 * Page that opens an order request in draft.
 * The files of the customizations are attached afterwards, from the order page the creation leads to.
 */
@Component({
  selector: 'rocket-orders-create',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    FormToolbarComponent,
    OrderFormComponent,
  ],
  templateUrl: './orders-create.component.html',
})
export class OrdersCreateComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Orders API service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);

  /** View child reference to the order form component. */
  form = viewChild<OrderFormComponent>('form');

  /**
   * Creates the order and opens it.
   */
  createOrder(): void {
    const form = this.form();
    const value = form?.orderForm.getRawValue();
    if (!form || !value?.companyId) return;

    const customizations = form.customizationsValue();
    const orderDto: CoreCreateOrderDto = {
      companyId: value.companyId,
      lines: form.linesValue(),
      ...(value.code?.trim() ? { code: value.code.trim() } : {}),
      ...(customizations.length ? { customizations } : {}),
    };

    this._ordersApiService.createOrder(orderDto).subscribe(order => {
      this._router.navigate(['..', order.id], { relativeTo: this._activatedRoute });
    });
  }
}
