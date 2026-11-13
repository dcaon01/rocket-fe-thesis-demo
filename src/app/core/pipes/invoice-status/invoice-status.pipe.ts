import { Pipe, PipeTransform } from '@angular/core';
import { InvoiceStatus } from '../../enums/invoice-status.enum';
import { ScheduleStatus } from '../../enums/schedule-status.enum';

/** Pipe that translates the collection status of an invoice, or of a payment of the schedule, into its Italian label. */
@Pipe({
  name: 'invoiceStatus'
})
export class InvoiceStatusPipe implements PipeTransform {

  /**
   * Transforms an invoice status value into its label.
   * @param value the value to transform.
   * @param payer whether the reader pays the invoice, as a reseller does with the ones of Keus.
   * @returns the label.
   */
  transform(value: string | null | undefined, payer = false): string {
    switch (value) {
      case InvoiceStatus.Open:
        return payer ? 'Da pagare' : 'Da incassare';
      case InvoiceStatus.Paid:
        return 'Pagata';
      case InvoiceStatus.Unpaid:
        return 'Insoluta';
      case InvoiceStatus.Void:
        return 'Annullata';
      case ScheduleStatus.Expected:
        return 'Prevista';
      default:
        return '-';
    }
  }
}
