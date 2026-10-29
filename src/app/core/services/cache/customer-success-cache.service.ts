import { inject, Injectable } from '@angular/core';
import { CoreResponseCustomerSuccessDashboardMetricsDto, CoreResponseSupportPeriodRecordDto } from '../../../../../libs/api/src';
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
 * Service to cache the customer success metrics for five minutes, one entry per period and number of intervals:
 * the global page and the product workspaces read the same data. The support metrics from Intercom are cached on
 * their own, so a failure of Intercom leaves the other figures in place.
 */
@Injectable({
  providedIn: 'root'
})
export class CustomerSuccessCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached entry. */
  private readonly _cache = new Map<string, CacheEntry<CoreResponseCustomerSuccessDashboardMetricsDto>>();

  /** Map of fetch key → cached support records. */
  private readonly _supportCache = new Map<string, CacheEntry<CoreResponseSupportPeriodRecordDto[]>>();

  /**
   * Fetches the customer success metrics for the given period, or reads them from the cache while still valid.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the metrics data.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshCustomerSuccessMetrics(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseCustomerSuccessDashboardMetricsDto) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${intervals ?? ''}`;
    const cached = this._cache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getCustomerSuccessDashboardMetrics(period, intervals).subscribe({
      next: (metrics) => {
        this._cache.set(fetchKey, { data: metrics, timestamp: Date.now() });
        onData(metrics);
      },
      error: (error) => {
        console.error('Error refreshing customer success metrics cache:', error);
        // Reads raise no toast of their own.
        this._toasterService.showError('Non è stato possibile leggere le metriche di customer success.');
        onError?.();
      }
    });
  }

  /**
   * Fetches the support metrics for the given period, or reads them from the cache while still valid.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the support records.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshSupportMetrics(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseSupportPeriodRecordDto[]) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${intervals ?? ''}`;
    const cached = this._supportCache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getSupportDashboardMetrics(period, intervals).subscribe({
      next: (records) => {
        this._supportCache.set(fetchKey, { data: records, timestamp: Date.now() });
        onData(records);
      },
      error: (error) => {
        console.error('Error refreshing support metrics cache:', error);
        this._toasterService.showError("Non è stato possibile leggere le metriche dell'assistenza.");
        onError?.();
      }
    });
  }
}
