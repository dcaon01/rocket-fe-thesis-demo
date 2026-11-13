import { inject, Injectable } from '@angular/core';
import { CoreResponseAvailabilityPeriodRecordDto, CoreResponseTechnicalErrorsDashboardMetricsDto, CoreResponseTechnicalErrorsIssuesDto } from '../../../../../libs/api/src';
import { MetricsApiService } from '../api-services/metrics/metrics-api.service';
import { ToasterService } from '../toaster/toaster.service';

/** Cache TTL in milliseconds. */
const CACHE_TTL_MS = 300_000;

/** Cached entry with data and timestamp. */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Service to cache the technical metrics for five minutes, one entry per period and number of intervals: the global
 * page and the product workspaces read the same data. Errors from Sentry and availability are cached on their own,
 * so a failure of Sentry leaves the availability in place.
 */
@Injectable({
  providedIn: 'root'
})
export class TechnicalMetricsCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached errors and alerts. */
  private readonly _errorsCache = new Map<string, CacheEntry<CoreResponseTechnicalErrorsDashboardMetricsDto>>();

  /** Map of product → cached issues of the current month, the key is empty for every product. */
  private readonly _issuesCache = new Map<string, CacheEntry<CoreResponseTechnicalErrorsIssuesDto>>();

  /** Map of fetch key → cached availability records. */
  private readonly _availabilityCache = new Map<string, CacheEntry<CoreResponseAvailabilityPeriodRecordDto[]>>();

  /**
   * Fetches the errors and the alerts for the given period, or reads them from the cache while still valid.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the metrics.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshTechnicalErrors(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseTechnicalErrorsDashboardMetricsDto) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${intervals ?? ''}`;
    const cached = this._errorsCache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getTechnicalErrorsDashboardMetrics(period, intervals).subscribe({
      next: (metrics) => {
        this._errorsCache.set(fetchKey, { data: metrics, timestamp: Date.now() });
        onData(metrics);
      },
      error: (error) => {
        console.error('Error refreshing technical errors metrics cache:', error);
        // Reads raise no toast of their own.
        this._toasterService.showError('Non è stato possibile leggere gli errori da Sentry.');
        onError?.();
      }
    });
  }

  /**
   * Fetches the issues of the current month, or reads them from the cache while still valid. A failure raises no
   * toast: the table that shows them tells it.
   * @param productId the product to read, null for every product.
   * @param onData callback invoked with the issues.
   * @param onError callback invoked when the read fails.
   */
  refreshTechnicalErrorsIssues(
    productId: string | null,
    onData: (data: CoreResponseTechnicalErrorsIssuesDto) => void,
    onError?: () => void,
  ): void {
    const fetchKey = productId ?? '';
    const cached = this._issuesCache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getTechnicalErrorsIssues(productId ?? undefined).subscribe({
      next: (issues) => {
        this._issuesCache.set(fetchKey, { data: issues, timestamp: Date.now() });
        onData(issues);
      },
      error: (error) => {
        console.error('Error refreshing technical errors issues cache:', error);
        onError?.();
      }
    });
  }

  /**
   * Fetches the availability for the given period, or reads it from the cache while still valid.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the availability records.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshAvailability(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseAvailabilityPeriodRecordDto[]) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${intervals ?? ''}`;
    const cached = this._availabilityCache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getAvailabilityDashboardMetrics(period, intervals).subscribe({
      next: (records) => {
        this._availabilityCache.set(fetchKey, { data: records, timestamp: Date.now() });
        onData(records);
      },
      error: (error) => {
        console.error('Error refreshing availability metrics cache:', error);
        this._toasterService.showError('Non è stato possibile leggere la disponibilità dei prodotti.');
        onError?.();
      }
    });
  }
}
