import { Component } from '@angular/core';
import { OrderListComponent } from '../../components/order-list/order-list.component';

/**
 * Global queue of the orders, of every channel and every product.
 */
@Component({
  selector: 'rocket-orders',
  imports: [OrderListComponent],
  templateUrl: './orders.component.html',
})
export class OrdersComponent {}
