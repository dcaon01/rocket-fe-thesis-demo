import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import {
  CoreInvoicesService,
  CoreKeusSchedulePageQueryDto,
  CorePeriodInvoicesPageQueryDto,
  CoreResponseInvoicesPageDto,
  CoreResponseSchedulePageDto,
} from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';
import { ToasterService } from '../../toaster/toaster.service';

/** Filters shared by the invoice listings. */
export type InvoicesFilters = Omit<CorePeriodInvoicesPageQueryDto, 'limit' | 'cursor' | 'from' | 'to'>;

/** Filters of the schedule of Keus, whose states include the expected payments. */
export type ScheduleFilters = Omit<CoreKeusSchedulePageQueryDto, 'limit' | 'cursor' | 'from' | 'to'>;

/**
 * Wrapper around the generated invoices API: the lists of the billing pages, the actions on an invoice
 * and on its electronic invoice at Sibill, and the pro forma sent to the resellers.
 */
@Injectable({
  providedIn: 'root'
})
export class InvoicesApiService {
  /** Core invoices service instance. */
  private readonly _coreInvoicesService = inject(CoreInvoicesService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /**
   * Lists one page of the invoices issued in a period.
   * @param from the start of the period (ISO).
   * @param to the end of the period (ISO).
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of invoices, newest first.
   */
  listInvoicesOfPeriod(from: string, to: string, page: PageRequest, filters: InvoicesFilters): Observable<CoreResponseInvoicesPageDto> {
    return this._coreInvoicesService.invoicesControllerGetInvoicesOfPeriod({ body: { from, to, ...page, ...filters } });
  }

  /**
   * Lists one page of the payments that fall due in a period: the invoices to collect, failed or collected, and the
   * payments expected from the contracts in force.
   * @param from the start of the period (ISO).
   * @param to the end of the period (ISO).
   * @param page the page to read.
   * @param filters the filters of the listing.
   * @returns the page of the schedule, by due date.
   */
  listScheduleOfPeriod(from: string, to: string, page: PageRequest, filters: ScheduleFilters): Observable<CoreResponseSchedulePageDto> {
    return this._coreInvoicesService.invoicesControllerGetScheduleOfPeriod({ body: { from, to, ...page, ...filters } });
  }

  /**
   * Records by hand the payment of an invoice that no Stripe charge collects.
   * @param billedPartyId the billed party of the invoice.
   * @param id the invoice.
   * @returns the completion.
   */
  markPaid(billedPartyId: string, id: string): Observable<void> {
    return this._coreInvoicesService.invoicesControllerMarkPaid({ billedPartyId, id });
  }

  /**
   * Issues again the electronic invoice of an invoice at Sibill.
   * @param billedPartyId the billed party of the invoice.
   * @param id the invoice.
   * @param confirmedNotAtSibill whether the operator checked that Sibill has no document for it.
   * @returns the completion; the outcome is on the invoice.
   */
  reissueDocument(billedPartyId: string, id: string, confirmedNotAtSibill: boolean): Observable<void> {
    return this._coreInvoicesService.invoicesControllerReissueDocument({ billedPartyId, id, body: { confirmedNotAtSibill } });
  }

  /**
   * Links to an invoice the document an operator found at Sibill.
   * @param billedPartyId the billed party of the invoice.
   * @param id the invoice.
   * @param sibillId the identifier of the document at Sibill.
   * @returns the completion.
   */
  linkDocument(billedPartyId: string, id: string, sibillId: string): Observable<void> {
    return this._coreInvoicesService.invoicesControllerLinkDocument({ billedPartyId, id, body: { sibillId } });
  }

  /**
   * Signs the download URL of the pro forma of an invoice to a reseller; a failure is shown to the user, as the
   * interceptor does not show the errors of a read.
   * @param billedPartyId the reseller billed.
   * @param id the invoice.
   * @returns the signed URL of the PDF.
   */
  getProFormaUrl(billedPartyId: string, id: string): Observable<string> {
    return this._coreInvoicesService.invoicesControllerGetProFormaUrl({ billedPartyId, id }).pipe(
      map(response => response.url),
      tap({ error: () => this._toasterService.showError('Non è stato possibile aprire la pro forma.') }),
    );
  }
}
