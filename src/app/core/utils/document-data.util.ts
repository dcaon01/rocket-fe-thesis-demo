import {
  CoreLegalAddress,
  CoreResponseCompanyDto,
  CoreResponseOrderDto,
  CoreResponsePlanDto,
  CoreResponseResellerDto,
} from '../../../../libs/api/src';
import { CustomizationStatus } from '../enums/customization-status.enum';
import { Financier } from '../enums/financier.enum';
import { PlanType } from '../enums/plan-type.enum';
import { TemplateData } from './template-data.util';

/** Reseller data an indirect-channel offer is printed with, its logo already read. */
export interface OfferReseller {
  /** The reseller record. */
  reseller: CoreResponseResellerDto;
  /** Logo bytes, PNG or JPEG; absent when the reseller has none. */
  logo?: Uint8Array;
}

/**
 * Builds the data of an offer from the order, keyed as the offer catalog of the backend.
 * Amounts are the ones the backend priced, formatted; one-off and recurring amounts are never summed together.
 * @param order the order, with its lines and customizations.
 * @param company the company the order is placed for.
 * @param plans the plans of the lines, by identifier.
 * @param seller the reseller and its logo, on the indirect channel.
 * @returns the data to fill the offer template with.
 */
export function offerData(
  order: CoreResponseOrderDto,
  company: CoreResponseCompanyDto,
  plans: Record<string, CoreResponsePlanDto>,
  seller?: OfferReseller,
): TemplateData {
  let oneOffCents = 0;
  let monthlyCents = 0;
  let assistanceCents = 0;

  const lines = (order.lines ?? []).map(line => {
    const plan = line.planId ? plans[line.planId] : undefined;
    const offerActivationCents = line.offerActivationCents ?? 0;
    const offerRecurringCents = line.offerRecurringCents ?? 0;
    oneOffCents += offerActivationCents;
    if (plan?.type === PlanType.OneTime) {
      oneOffCents += offerRecurringCents;
    } else {
      monthlyCents += plan?.billingInterval === 'MONTHLY' ? offerRecurringCents : offerRecurringCents / 12;
    }
    assistanceCents += line.assistance?.amountCents ?? 0;
    return {
      product: { name: line.productName },
      plan: { name: line.planName ?? plan?.name ?? '' },
      seats: line.seats !== undefined ? String(line.seats) : '',
      billing: billingLabel(plan),
      listActivation: formatCents(line.listActivationCents),
      activationDiscount: formatPercent(line.activationDiscountPercent),
      activation: formatCents(line.offerActivationCents),
      listRecurring: formatCents(line.listRecurringCents),
      recurringDiscount: formatPercent(line.recurringDiscountPercent),
      recurring: formatCents(line.offerRecurringCents),
      assistance: formatCents(line.assistance?.amountCents),
      assistanceLabel: line.assistance?.label ?? '',
    };
  });

  const customizations = (order.customizations ?? [])
    .filter(customization => customization.status === CustomizationStatus.Quoted)
    .map(customization => {
      oneOffCents += customization.offerOneOffCents ?? 0;
      monthlyCents += (customization.offerRecurringIncreaseCents ?? 0) / 12;
      return {
        product: order.lines?.find(line => line.productId === customization.productId)?.productName ?? '',
        description: customization.description ?? '',
        oneOffAmount: formatCents(customization.offerOneOffCents),
        recurringAmount: formatCents(customization.offerRecurringIncreaseCents),
        discount: formatPercent(customization.discountPercent),
      };
    });

  return {
    today: formatDate(new Date().toISOString()),
    order: { code: order.code, date: formatDate(order.requestedAt) },
    company: companyData(company),
    ...(seller ? { reseller: resellerData(seller) } : {}),
    lines,
    customizations,
    totals: {
      oneOff: formatCents(oneOffCents),
      monthly: formatCents(Math.round(monthlyCents)),
      yearly: formatCents(Math.round(monthlyCents * 12)),
      assistance: assistanceCents > 0 ? formatCents(assistanceCents) : '',
    },
    financing: order.financier && order.financier !== Financier.None ? 'sì' : '',
  };
}

/**
 * Formats an amount in cents as euros, the Italian way.
 * @param cents the amount in cents.
 * @returns the formatted amount, or an empty string when there is none.
 */
export function formatCents(cents: number | undefined): string {
  if (cents === undefined) return '';
  return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

/**
 * Formats a percentage.
 * @param percent the percentage.
 * @returns the formatted percentage, or an empty string when there is none.
 */
function formatPercent(percent: number | undefined): string {
  return percent ? `${percent}%` : '';
}

/**
 * Formats an ISO date as dd/MM/yyyy.
 * @param iso the ISO date.
 * @returns the formatted date, or an empty string when there is none.
 */
function formatDate(iso: string | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

/**
 * Formats a legal address on one line: street, postal code, city and province.
 * @param address the structured address.
 * @returns the address on one line, or an empty string when there is none.
 */
function formatAddress(address: CoreLegalAddress | undefined): string {
  if (!address) return '';
  const city = [address.zipCode, address.city].filter(Boolean).join(' ');
  return [address.street, address.province ? `${city} (${address.province})` : city].filter(Boolean).join(', ');
}

/**
 * Names the billing period of a plan.
 * @param plan the plan, when known.
 * @returns «una tantum», «mensile» or «annuale».
 */
function billingLabel(plan: CoreResponsePlanDto | undefined): string {
  if (!plan) return '';
  if (plan.type === PlanType.OneTime) return 'una tantum';
  return plan.billingInterval === 'MONTHLY' ? 'mensile' : 'annuale';
}

/**
 * Maps the company fields the catalog names.
 * @param company the company.
 * @returns the company data.
 */
function companyData(company: CoreResponseCompanyDto): TemplateData {
  return {
    name: company.name,
    vatNumber: company.vatNumber ?? '',
    fiscalCode: company.fiscalCode ?? '',
    address: formatAddress(company.legalAddress) || (company.address ?? ''),
    pec: company.pec ?? '',
    sdi: company.sdi ?? '',
  };
}

/**
 * Maps the reseller fields the catalog names, with the logo as bytes.
 * @param seller the reseller and its logo.
 * @returns the reseller data.
 */
function resellerData(seller: OfferReseller): TemplateData {
  const { reseller, logo } = seller;
  return {
    name: reseller.companyName,
    vatNumber: reseller.vatNumber ?? '',
    address: formatAddress(reseller.legalAddress) || (reseller.address ?? ''),
    pec: reseller.pec ?? '',
    email: reseller.email,
    ...(logo ? { logo } : {}),
  };
}
