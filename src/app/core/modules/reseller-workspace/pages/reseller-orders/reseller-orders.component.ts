import { Component } from '@angular/core';
import { OrderListComponent } from '../../../orders/components/order-list/order-list.component';

/**
 * Queue of the orders of the reseller whose workspace is open.
 */
@Component({
  selector: 'rocket-reseller-orders',
  imports: [OrderListComponent],
  templateUrl: './reseller-orders.component.html',
})
export class ResellerOrdersComponent {}
