import { Component } from '@angular/core';
import { InvoiceListComponent } from '../../components/invoice-list/invoice-list.component';

/**
 * Page of the invoices issued in a month, to companies, resellers and finance companies.
 */
@Component({
  selector: 'rocket-invoices',
  imports: [InvoiceListComponent],
  templateUrl: './invoices.component.html',
})
export class InvoicesComponent {}
