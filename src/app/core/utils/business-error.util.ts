import { HttpErrorResponse } from '@angular/common/http';

/** Italian reasons of the refusals the backend names with a code, filled from the details it sends along. */
const BUSINESS_ERRORS: Record<string, (details: Record<string, unknown>) => string> = {
  COMPANY_ORDER_OPEN: details => `L'azienda ha già ${text(details['orderCode'], 'un ordine', 'l\'ordine ')} aperto su un prodotto di questo ordine.`,
  COMPANY_CONTRACT_IN_FORCE: details => `L'azienda ha ${text(details['contractCode'], 'un contratto', 'il contratto ')} in vigore su un prodotto di questo ordine: il nuovo si apre a contratto cessato.`,
  COMPANY_PRODUCT_HELD: details => `${text(details['orderCode'], 'Un altro ordine', 'L\'ordine ')} sta già erogando questo prodotto per l'azienda.`,
  TENANT_IN_PROVISIONING: () => 'Il tenant sta passando a un altro ordine.',
  TWIN_CONTRACT_IN_FORCE: details => `${text(details['companyName'], 'La stessa azienda')} è nel canale di arrivo con ${text((details['contractCodes'] as string[] | undefined)?.join(', '), 'un contratto', 'il contratto ')} in vigore su un prodotto che arriva.`,
  TWIN_ORDER_OPEN: details => `Con ${text(details['companyName'], 'la stessa azienda')} nel canale di arrivo, ${text((details['orderCodes'] as string[] | undefined)?.join(', '), 'un ordine', 'l\'ordine ')} è aperto su un prodotto in vigore dall'altra parte: chiudilo prima del trasferimento.`,
};

/**
 * Writes a detail of the backend into a reason, or a generic wording when the detail is missing.
 * @param value the detail.
 * @param fallback the wording without the detail.
 * @param prefix the words before the detail, when there is one.
 * @returns the text.
 */
function text(value: unknown, fallback: string, prefix = ''): string {
  return typeof value === 'string' && value ? `${prefix}${value}` : fallback;
}

/**
 * Reads the reason of a refusal of the backend, when its code has one in Italian.
 * Usage: businessErrorMessage(error) ?? genericMessage
 * @param error the error of the request.
 * @returns the reason, or undefined for any other error.
 */
export function businessErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof HttpErrorResponse)) return undefined;

  const details = (error.error?.details ?? {}) as Record<string, unknown>;
  const reason = BUSINESS_ERRORS[String(details['code'])];
  return reason?.(details);
}
