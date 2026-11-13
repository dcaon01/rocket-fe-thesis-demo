import { inject, Injectable } from '@angular/core';
import { CoreResponseRevenueDashboardMetricsRecordDto } from '../../../../../libs/api/src';
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
 * Service to cache and manage revenue dashboard metrics state.
 * Provides a centralized way to access and refresh revenue data.
 * Data is cached for 30 seconds before being refreshed from the API.
 * Each parameter combination is cached independently.
 */
@Injectable({
  providedIn: 'root'
})
export class RevenueCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached entry. */
  private readonly _cache = new Map<string, CacheEntry<CoreResponseRevenueDashboardMetricsRecordDto[]>>();

  /**
   * Fetches revenue dashboard metrics for the given period and updates the cache.
   * Skips the API call if the cache is still valid (within TTL and same parameters),
   * invoking the callback with cached data instead.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the metrics data.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops its placeholders.
   */
  refreshRevenueMetrics(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseRevenueDashboardMetricsRecordDto[]) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${intervals ?? ''}`;
    const cached = this._cache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getRevenueDashboardMetrics(period, intervals).subscribe({
      next: (metrics) => {
        this._cache.set(fetchKey, { data: metrics, timestamp: Date.now() });
        onData(metrics);
      },
      error: (error) => {
        console.error('Error refreshing revenue metrics cache:', error);
        // Reads raise no toast of their own: without one the section would keep the figures of the previous selection.
        this._toasterService.showError('Non è stato possibile leggere il fatturato.');
        onError?.();
      }
    });
  }
}
