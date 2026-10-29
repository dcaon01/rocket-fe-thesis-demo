import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CoreCreateCustomerChargeDto,
  CoreCustomerChargesService,
  CoreResellerInvoicesPageQueryDto,
  CoreResellerSchedulePageQueryDto,
  CoreResponseCustomerChargeDto,
  CoreResponseSchedulePageDto,
  CoreUpdateCustomerChargeDto,
} from '../../../../../../libs/api/src';
import { PageRequest } from '../../../interfaces/page.interface';

/** Filters of the schedule of a reseller. */
export type ResellerScheduleFilters = Omit<CoreResellerSchedulePageQueryDto, 'limit' | 'cursor' | 'from' | 'to'>;

/** Filters of the invoices of a reseller. */
export type ResellerInvoicesFilters = Omit<CoreResellerInvoicesPageQueryDto, 'limit' | 'cursor' | 'from' | 'to'>;

/**
 * Wrapper around the generated customer charges API: the schedule and the invoices of a reseller, with what it pays
 * Keus and what it collects from its customers, and the items it adds by hand for them.
 */
@Injectable({
  providedIn: 'root'
})
export class CustomerChargesApiService {
  /** Core customer charges service instance. */
  private readonly _coreCustomerChargesService = inject(CoreCustomerChargesService);

  /**
   * Lists one page of the schedule of a reseller in a period, by due date.
   * @param resellerId the reseller.
   * @param from the start of the period (ISO).
   * @param to the end of the period (ISO).
   * @param page the page to read.
   * @param filters the filters of the schedule.
   * @returns the page of the schedule.
   */
  listSchedule(resellerId: string, from: string, to: string, page: PageRequest, filters: ResellerScheduleFilters): Observable<CoreResponseSchedulePageDto> {
    return this._coreCustomerChargesService.customerChargesControllerGetSchedule({ resellerId, body: { from, to, ...page, ...filters } });
  }

  /**
   * Lists one page of the invoices of a reseller in a period, latest due date first: the invoices of Keus and the due
   * dates of its customers already reached.
   * @param resellerId the reseller.
   * @param from the start of the period (ISO).
   * @param to the end of the period (ISO).
   * @param page the page to read.
   * @param filters the filters of the invoices.
   * @returns the page of the invoices.
   */
  listInvoices(resellerId: string, from: string, to: string, page: PageRequest, filters: ResellerInvoicesFilters): Observable<CoreResponseSchedulePageDto> {
    return this._coreCustomerChargesService.customerChargesControllerGetInvoices({ resellerId, body: { from, to, ...page, ...filters } });
  }

  /**
   * Adds an item the reseller bills one of its customers.
   * @param resellerId the reseller.
   * @param charge the item.
   * @returns the item.
   */
  createCharge(resellerId: string, charge: CoreCreateCustomerChargeDto): Observable<CoreResponseCustomerChargeDto> {
    return this._coreCustomerChargesService.customerChargesControllerCreateCharge({ resellerId, body: charge });
  }

  /**
   * Reads an item of the reseller.
   * @param resellerId the reseller.
   * @param id the item.
   * @returns the item.
   */
  getCharge(resellerId: string, id: string): Observable<CoreResponseCustomerChargeDto> {
    return this._coreCustomerChargesService.customerChargesControllerGetCharge({ resellerId, id });
  }

  /**
   * Changes an item the reseller added by hand.
   * @param resellerId the reseller.
   * @param id the item.
   * @param charge the fields to change.
   * @returns the item.
   */
  updateCharge(resellerId: string, id: string, charge: CoreUpdateCustomerChargeDto): Observable<CoreResponseCustomerChargeDto> {
    return this._coreCustomerChargesService.customerChargesControllerUpdateCharge({ resellerId, id, body: charge });
  }

  /**
   * Deletes an item the reseller added by hand.
   * @param resellerId the reseller.
   * @param id the item.
   * @returns the completion.
   */
  deleteCharge(resellerId: string, id: string): Observable<void> {
    return this._coreCustomerChargesService.customerChargesControllerDeleteCharge({ resellerId, id });
  }

  /**
   * Marks a due date of an item collected, or not collected.
   * @param resellerId the reseller.
   * @param id the item.
   * @param collected whether the due date is collected.
   * @param dueDate the due date of a recurring item.
   * @returns the item.
   */
  setCollected(resellerId: string, id: string, collected: boolean, dueDate?: string): Observable<CoreResponseCustomerChargeDto> {
    return this._coreCustomerChargesService.customerChargesControllerSetCollected({ resellerId, id, body: { collected, ...(dueDate && { dueDate }) } });
  }
}
