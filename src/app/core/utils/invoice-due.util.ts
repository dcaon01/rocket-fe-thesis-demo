import { CoreResponseExpectedChargeDto, CoreResponseInvoiceDto, CoreResponseScheduleEntryDto } from '../../../../libs/api/src';
import { ScheduleDirection } from '../enums/schedule-direction.enum';
import { InvoiceStatus } from '../enums/invoice-status.enum';

/** Days ahead in which an open invoice is marked as falling due (UR-RK-153). */
const DUE_SOON_DAYS = 7;

/** Marker of an open invoice on the payment schedule: past its due date, or falling due within a week. */
export type InvoiceDueState = 'overdue' | 'dueSoon';

/**
 * Tells how close an open invoice is to its due date; the unpaid ones have their own status and dunning.
 * @param invoice the invoice.
 * @param now the current instant.
 * @returns the marker, or null when the invoice is not open or not close to its due date.
 */
export function invoiceDueState(invoice: CoreResponseInvoiceDto, now: Date = new Date()): InvoiceDueState | null {
  if (invoice.status !== InvoiceStatus.Open || !invoice.dueDate) return null;

  return dueStateOf(invoice.dueDate, now);
}

/**
 * Tells how close a due date still open is: past, within a week, or further.
 * @param dueDate the due date (ISO).
 * @param now the current instant.
 * @returns the marker, or null when the due date is further than a week.
 */
export function dueStateOf(dueDate: string, now: Date = new Date()): InvoiceDueState | null {
  const due = new Date(dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return 'overdue';
  return days <= DUE_SOON_DAYS ? 'dueSoon' : null;
}

/**
 * Returns the address of the contract an invoice comes from, for the Keus users.
 * @param invoice the invoice.
 * @returns the route of the contract or of the reseller contract, or null when the invoice has none.
 */
export function invoiceContractRoute(invoice: CoreResponseInvoiceDto): string[] | null {
  const productId = invoice.items.find(item => item.productId)?.productId;
  if (invoice.contractId && productId) return ['/products/workspaces', productId, 'contracts', invoice.contractId];
  if (invoice.resellerContractId) return ['/billing/reseller-contracts', invoice.billedPartyId, invoice.resellerContractId];
  return null;
}

/**
 * Returns the address of the contract an expected payment comes from.
 * @param expected the expected payment.
 * @returns the route of the contract or of the reseller contract, or null when it has none.
 */
export function expectedContractRoute(expected: CoreResponseExpectedChargeDto): string[] | null {
  if (expected.contractId && expected.productId) return ['/products/workspaces', expected.productId, 'contracts', expected.contractId];
  if (expected.resellerContractId) return ['/billing/reseller-contracts', expected.billedPartyId, expected.resellerContractId];
  return null;
}

/**
 * Turns an invoice into a due date of a schedule, as the schedules list them.
 * @param invoice the invoice.
 * @returns the due date.
 */
export function invoiceEntry(invoice: CoreResponseInvoiceDto): CoreResponseScheduleEntryDto {
  return { key: `invoice#${invoice.id}`, direction: ScheduleDirection.ToKeus, dueDate: invoice.dueDate ?? invoice.issuedAt, invoice };
}
