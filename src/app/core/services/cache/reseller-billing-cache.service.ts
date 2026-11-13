import { inject, Injectable } from '@angular/core';
import { CoreResponseResellerBillingDto } from '../../../../../libs/api/src';
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
 * Service to cache the economic position of a reseller towards Keus, as the reseller revenue cache does.
 * Each combination of reseller and period is cached independently.
 */
@Injectable({
  providedIn: 'root'
})
export class ResellerBillingCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached entry. */
  private readonly _cache = new Map<string, CacheEntry<CoreResponseResellerBillingDto>>();

  /**
   * Fetches the economic position of a reseller and updates the cache, or hands back the cached data within the TTL.
   * @param resellerId the reseller whose economic position is read.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the economic position.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops its placeholders.
   */
  refreshResellerBillingMetrics(
    resellerId: string,
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseResellerBillingDto) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${resellerId}_${period}_${intervals ?? ''}`;
    const cached = this._cache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getResellerBillingDashboardMetrics(resellerId, period, intervals).subscribe({
      next: (billing) => {
        this._cache.set(fetchKey, { data: billing, timestamp: Date.now() });
        onData(billing);
      },
      error: (error) => {
        console.error('Error refreshing reseller billing metrics cache:', error);
        // Reads raise no toast of their own: without one the section would keep the figures of the previous selection.
        this._toasterService.showError('Non è stato possibile leggere la posizione economica del rivenditore.');
        onError?.();
      }
    });
  }
}
