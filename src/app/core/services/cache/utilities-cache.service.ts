import { inject, Injectable } from '@angular/core';
import { CoreResponseUtilitiesDashboardMetricsRecordDto } from '../../../../../libs/api/src';
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
 * Service to cache and manage utilities dashboard metrics state.
 * Provides a centralized way to access and refresh utilities data.
 * Data is cached for 30 seconds before being refreshed from the API.
 * Each parameter combination is cached independently.
 */
@Injectable({
  providedIn: 'root'
})
export class UtilitiesCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached entry. */
  private readonly _cache = new Map<string, CacheEntry<CoreResponseUtilitiesDashboardMetricsRecordDto[]>>();

  /**
   * Fetches utilities dashboard metrics for the given period and logic, then updates the cache.
   * Skips the API call if the cache is still valid (within TTL and same parameters),
   * invoking the callback with cached data instead.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param logic the logic type ('ACTIVE' or 'ACTIVATED').
   * @param onData callback invoked with the metrics data.
   * @param intervals optional number of intervals to retrieve.
   * @param resellerId optional reseller whose utilities are read.
   * @param onError callback invoked when the read fails, so the caller drops its placeholders.
   */
  refreshUtilitiesMetrics(
    period: 'ANNUAL' | 'MONTHLY',
    logic: 'ACTIVE' | 'ACTIVATED',
    onData: (data: CoreResponseUtilitiesDashboardMetricsRecordDto[]) => void,
    intervals?: number,
    resellerId?: string,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${logic}_${intervals ?? ''}_${resellerId ?? ''}`;
    const cached = this._cache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getUtilitiesDashboardMetrics(period, logic, intervals, resellerId).subscribe({
      next: (metrics) => {
        this._cache.set(fetchKey, { data: metrics, timestamp: Date.now() });
        onData(metrics);
      },
      error: (error) => {
        console.error('Error refreshing utilities metrics cache:', error);
        // Reads raise no toast of their own: without one the section would keep the figures of the previous selection.
        this._toasterService.showError('Non è stato possibile leggere le utenze.');
        onError?.();
      }
    });
  }
}
