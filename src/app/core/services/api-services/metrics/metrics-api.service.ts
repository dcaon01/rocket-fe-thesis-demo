import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CoreMetricsService,
  CoreResponseActiveCompaniesPeriodRecordDto,
  CoreResponseAvailabilityPeriodRecordDto,
  CoreResponseCustomerSuccessDashboardMetricsDto,
  CoreResponseIntercomBrandDto,
  CoreResponseMixpanelTenantKpiDto,
  CoreResponseProductAdoptionPeriodRecordDto,
  CoreResponseResellerBillingDto,
  CoreResponseResellerNetworkEntryDto,
  CoreResponseResellerOverviewPeriodRecordDto,
  CoreResponseResellerRevenueDashboardMetricsRecordDto,
  CoreResponseResellerWorklistDto,
  CoreResponseRevenueDashboardMetricsRecordDto,
  CoreResponseSalesDashboardMetricsDto,
  CoreResponseSalesOrdersDashboardMetricsDto,
  CoreResponseSentryProjectDto,
  CoreResponseSupportPeriodRecordDto,
  CoreResponseTechnicalErrorsDashboardMetricsDto,
  CoreResponseTechnicalErrorsIssuesDto,
  CoreResponseUtilitiesDashboardMetricsRecordDto,
} from '../../../../../../libs/api/src/lib/rocket-core';
import { SKIP_LOADING_OVERLAY } from '../../../interceptors/loading/loading.interceptor';

/**
 * Service for managing metrics-related API calls.
 */
@Injectable({
  providedIn: 'root'
})
export class MetricsApiService {
  /** Core metrics service instance. */
  private readonly _coreMetricsService = inject(CoreMetricsService);

  /** Context of the dashboard reads: their sections show placeholders, so the overlay stays off. */
  private readonly _sectionContext = new HttpContext().set(SKIP_LOADING_OVERLAY, true);

  /**
   * Fetches revenue dashboard metrics for the given period: of the whole of Keus, or of what a Keus salesperson sold.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of revenue dashboard metrics records.
   */
  getRevenueDashboardMetrics(period: 'ANNUAL' | 'MONTHLY', intervals?: number): Observable<CoreResponseRevenueDashboardMetricsRecordDto[]> {
    return this._coreMetricsService.metricsControllerGetRevenueDashboardMetrics({ period, intervals }, this._sectionContext);
  }

  /**
   * Fetches what a reseller bills its customers and what it margins, for the given period.
   * @param resellerId the reseller whose revenue is read.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @param salesId optional salesperson of the reseller whose sales are read.
   * @returns an observable of reseller revenue dashboard metrics records.
   */
  getResellerRevenueDashboardMetrics(
    resellerId: string,
    period: 'ANNUAL' | 'MONTHLY',
    intervals?: number,
    salesId?: string,
  ): Observable<CoreResponseResellerRevenueDashboardMetricsRecordDto[]> {
    return this._coreMetricsService.metricsControllerGetResellerRevenueDashboardMetrics({ resellerId, period, intervals, salesId }, this._sectionContext);
  }

  /**
   * Fetches the active licenses, the new activations and the customers served of a reseller, per product and period.
   * @param resellerId the reseller whose overview is read.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of the overview records, with one record per period for every product together.
   */
  getResellerOverviewDashboardMetrics(
    resellerId: string,
    period: 'ANNUAL' | 'MONTHLY',
    intervals?: number,
  ): Observable<CoreResponseResellerOverviewPeriodRecordDto[]> {
    return this._coreMetricsService.metricsControllerGetResellerOverviewDashboardMetrics({ resellerId, period, intervals }, this._sectionContext);
  }

  /**
   * Fetches today's work of a reseller: orders in progress, renewals coming, customers at risk and opportunities.
   * @param resellerId the reseller whose worklist is read.
   * @returns an observable of the worklist.
   */
  getResellerWorklist(resellerId: string): Observable<CoreResponseResellerWorklistDto> {
    return this._coreMetricsService.metricsControllerGetResellerWorklist({ resellerId }, this._sectionContext);
  }

  /**
   * Fetches the economic position of a reseller towards Keus: invoices issued per period and the ones still to pay.
   * @param resellerId the reseller whose economic position is read.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of the economic position.
   */
  getResellerBillingDashboardMetrics(
    resellerId: string,
    period: 'ANNUAL' | 'MONTHLY',
    intervals?: number,
  ): Observable<CoreResponseResellerBillingDto> {
    return this._coreMetricsService.metricsControllerGetResellerBillingDashboardMetrics({ resellerId, period, intervals }, this._sectionContext);
  }

  /**
   * Fetches utilities dashboard metrics for the given period and logic, of the perimeter of the user or of one reseller.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param logic the logic type ('ACTIVE' or 'ACTIVATED').
   * @param intervals optional number of intervals to retrieve.
   * @param resellerId optional reseller whose utilities are read.
   * @returns an observable of the utilities dashboard metrics.
   */
  getUtilitiesDashboardMetrics(
    period: 'ANNUAL' | 'MONTHLY',
    logic: 'ACTIVE' | 'ACTIVATED',
    intervals?: number,
    resellerId?: string,
  ): Observable<CoreResponseUtilitiesDashboardMetricsRecordDto[]> {
    return this._coreMetricsService.metricsControllerGetUtilitiesDashboardMetrics({ period, logic, intervals, resellerId }, this._sectionContext);
  }

  /**
   * Fetches sales dashboard metrics of the HubSpot products pipeline: one record per period for the
   * whole pipeline, plus one per requested solution of interest.
   * @param solutions the solutions of interest to break the metrics down by.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of sales dashboard metrics.
   */
  getSalesDashboardMetrics(solutions: string[], period: 'ANNUAL' | 'MONTHLY', intervals?: number): Observable<CoreResponseSalesDashboardMetricsDto[]> {
    return this._coreMetricsService.metricsControllerGetSalesDashboardMetrics({
      period,
      ...(solutions.length ? { solutions: solutions.join(',') } : {}),
      intervals,
    }, this._sectionContext);
  }

  /**
   * Fetches the Rocket half of the sales metrics: orders requested and still open, trials closed and converted,
   * licenses activated per channel and reseller and provisioning times, per product, period and seller, plus the
   * trials active today. A Keus salesperson gets only what it sold.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of the sales orders metrics.
   */
  getSalesOrdersDashboardMetrics(period: 'ANNUAL' | 'MONTHLY', intervals?: number): Observable<CoreResponseSalesOrdersDashboardMetricsDto> {
    return this._coreMetricsService.metricsControllerGetSalesOrdersDashboardMetrics({ period, intervals }, this._sectionContext);
  }

  /**
   * Fetches the companies with at least one contract in force, per product and period, with the record of every
   * product together. The Keus back office must name a product.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @param productId optional product read, absent for every product.
   * @returns an observable of the active companies records.
   */
  getActiveCompaniesDashboardMetrics(
    period: 'ANNUAL' | 'MONTHLY',
    intervals?: number,
    productId?: string,
  ): Observable<CoreResponseActiveCompaniesPeriodRecordDto[]> {
    return this._coreMetricsService.metricsControllerGetActiveCompaniesDashboardMetrics({ period, intervals, productId }, this._sectionContext);
  }

  /**
   * Fetches today's resellers with the fee in force, where they are and the licenses they activated in the current
   * period.
   * @param period the current period of the licenses ('ANNUAL' or 'MONTHLY').
   * @returns an observable of the reseller network entries.
   */
  getResellerNetworkDashboardMetrics(period: 'ANNUAL' | 'MONTHLY'): Observable<CoreResponseResellerNetworkEntryDto[]> {
    return this._coreMetricsService.metricsControllerGetResellerNetworkDashboardMetrics({ period }, this._sectionContext);
  }

  /**
   * Fetches the customer success metrics of every product: churn and activation counts per product, period and
   * seller, and the customers to follow up today.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of the customer success metrics.
   */
  getCustomerSuccessDashboardMetrics(period: 'ANNUAL' | 'MONTHLY', intervals?: number): Observable<CoreResponseCustomerSuccessDashboardMetricsDto> {
    return this._coreMetricsService.metricsControllerGetCustomerSuccessDashboardMetrics({ period, intervals }, this._sectionContext);
  }

  /**
   * Fetches the support metrics of the products with an Intercom brand: conversations opened and closed, and their
   * reply and resolution times, per product and period.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of the support records.
   */
  getSupportDashboardMetrics(period: 'ANNUAL' | 'MONTHLY', intervals?: number): Observable<CoreResponseSupportPeriodRecordDto[]> {
    return this._coreMetricsService.metricsControllerGetSupportDashboardMetrics({ period, intervals }, this._sectionContext);
  }

  /**
   * Fetches the brands of the Intercom workspace, for the brand of a product.
   * @returns an observable of the brands.
   */
  getIntercomBrands(): Observable<CoreResponseIntercomBrandDto[]> {
    return this._coreMetricsService.metricsControllerGetIntercomBrands();
  }

  /**
   * Fetches the errors and the alerts of the products with a Sentry project, per product and period, with the alerts
   * open today.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of the technical errors metrics.
   */
  getTechnicalErrorsDashboardMetrics(period: 'ANNUAL' | 'MONTHLY', intervals?: number): Observable<CoreResponseTechnicalErrorsDashboardMetricsDto> {
    return this._coreMetricsService.metricsControllerGetTechnicalErrorsDashboardMetrics({ period, intervals }, this._sectionContext);
  }

  /**
   * Fetches the issues with most error events of the current month from Sentry, with the link to their projects.
   * @param productId optional product to read, every product with a Sentry project when absent.
   * @returns an observable of the issues.
   */
  getTechnicalErrorsIssues(productId?: string): Observable<CoreResponseTechnicalErrorsIssuesDto> {
    return this._coreMetricsService.metricsControllerGetTechnicalErrorsIssues({ productId }, this._sectionContext);
  }

  /**
   * Fetches the availability and the latency of the products with a health address, per product and period.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of the availability records.
   */
  getAvailabilityDashboardMetrics(period: 'ANNUAL' | 'MONTHLY', intervals?: number): Observable<CoreResponseAvailabilityPeriodRecordDto[]> {
    return this._coreMetricsService.metricsControllerGetAvailabilityDashboardMetrics({ period, intervals }, this._sectionContext);
  }

  /**
   * Fetches the projects of the Sentry organization, for the project of a product.
   * @returns an observable of the projects.
   */
  getSentryProjects(): Observable<CoreResponseSentryProjectDto[]> {
    return this._coreMetricsService.metricsControllerGetSentryProjects();
  }

  /**
   * Fetches the adoption counts of the products: per product, period, seller and lever, how many tenants came out
   * of the key rule in each way.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param intervals optional number of intervals to retrieve.
   * @returns an observable of the adoption records.
   */
  getProductAdoptionDashboardMetrics(period: 'ANNUAL' | 'MONTHLY', intervals?: number): Observable<CoreResponseProductAdoptionPeriodRecordDto[]> {
    return this._coreMetricsService.metricsControllerGetProductAdoptionDashboardMetrics({ period, intervals }, this._sectionContext);
  }

  /**
   * Fetches how every customer tenant came out of the key rules of its product, on the last day of the period.
   * @param from period start (YYYY-MM-DD).
   * @param to period end (YYYY-MM-DD), the evaluation date.
   * @param productId optional product filter; omit to fetch the tenants of every product.
   * @param resellerId optional reseller whose tenants are read; omit for the perimeter of the user.
   * @returns an observable of the per-tenant outcomes.
   */
  getMixpanelTenantKpi(from: string, to: string, productId?: string, resellerId?: string): Observable<CoreResponseMixpanelTenantKpiDto[]> {
    return this._coreMetricsService.metricsControllerGetMixpanelTenantKpi({ from, to, productId, resellerId });
  }
}
