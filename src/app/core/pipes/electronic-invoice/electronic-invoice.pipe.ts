import { Pipe, PipeTransform } from '@angular/core';
import { InvoiceDocumentStatus } from '../../enums/invoice-document-status.enum';

/** Pipe that translates the state of the electronic invoice of an invoice into its Italian label. */
@Pipe({
  name: 'electronicInvoice'
})
export class ElectronicInvoicePipe implements PipeTransform {

  /**
   * Transforms the state of an electronic invoice into its label.
   * @param value the value to transform.
   * @returns the label, or '-' for the invoices Rocket does not issue.
   */
  transform(value: string | null | undefined): string {
    switch (value) {
      case InvoiceDocumentStatus.ToIssue:
        return 'In attesa del pagamento';
      case InvoiceDocumentStatus.Issuing:
        return 'In creazione';
      case InvoiceDocumentStatus.Failed:
        return 'Non creata';
      case InvoiceDocumentStatus.Uncertain:
        return 'Da verificare';
      case InvoiceDocumentStatus.Draft:
        return 'Bozza su Sibill';
      case InvoiceDocumentStatus.Sent:
        return 'Inviata allo SDI';
      case InvoiceDocumentStatus.Delivered:
        return 'Consegnata';
      case InvoiceDocumentStatus.NotDelivered:
        return 'Non recapitata';
      case InvoiceDocumentStatus.Discarded:
        return 'Scartata dallo SDI';
      case InvoiceDocumentStatus.Refused:
        return 'Rifiutata';
      default:
        return '-';
    }
  }
}
