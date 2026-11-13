import { inject, Injectable } from '@angular/core';
import { CoreResponseResellerRevenueDashboardMetricsRecordDto } from '../../../../../libs/api/src';
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
 * Service to cache the revenue and margin of a reseller, as the revenue cache does for Keus.
 * Each combination of reseller, period and salesperson is cached independently.
 */
@Injectable({
  providedIn: 'root'
})
export class ResellerRevenueCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached entry. */
  private readonly _cache = new Map<string, CacheEntry<CoreResponseResellerRevenueDashboardMetricsRecordDto[]>>();

  /**
   * Fetches the revenue and margin of a reseller and updates the cache, or hands back the cached data within the TTL.
   * @param resellerId the reseller whose revenue is read.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the metrics data.
   * @param intervals optional number of intervals to retrieve.
   * @param salesId optional salesperson of the reseller whose sales are read.
   * @param onError callback invoked when the read fails, so the caller drops its placeholders.
   */
  refreshResellerRevenueMetrics(
    resellerId: string,
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseResellerRevenueDashboardMetricsRecordDto[]) => void,
    intervals?: number,
    salesId?: string,
    onError?: () => void,
  ): void {
    const fetchKey = `${resellerId}_${period}_${intervals ?? ''}_${salesId ?? ''}`;
    const cached = this._cache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getResellerRevenueDashboardMetrics(resellerId, period, intervals, salesId).subscribe({
      next: (metrics) => {
        this._cache.set(fetchKey, { data: metrics, timestamp: Date.now() });
        onData(metrics);
      },
      error: (error) => {
        console.error('Error refreshing reseller revenue metrics cache:', error);
        // Reads raise no toast of their own: without one the section would keep the figures of the previous selection.
        this._toasterService.showError('Non è stato possibile leggere il fatturato del rivenditore.');
        onError?.();
      }
    });
  }
}
