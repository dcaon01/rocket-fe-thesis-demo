import { inject, Injectable } from '@angular/core';
import { CoreResponseSalesDashboardMetricsDto, CoreResponseSalesOrdersDashboardMetricsDto } from '../../../../../libs/api/src';
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
 * Service to cache and manage sales dashboard metrics state.
 * Each parameter combination is cached independently with a 5-minute TTL. The Rocket half of the metrics is cached
 * on its own, so a failure of HubSpot leaves it in place.
 */
@Injectable({
  providedIn: 'root'
})
export class SalesCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached entry. */
  private readonly _cache = new Map<string, CacheEntry<CoreResponseSalesDashboardMetricsDto[]>>();

  /** Map of fetch key → cached Rocket half of the sales metrics. */
  private readonly _ordersCache = new Map<string, CacheEntry<CoreResponseSalesOrdersDashboardMetricsDto>>();

  /**
   * Fetches sales dashboard metrics broken down by solutions of interest and updates the cache.
   * Skips the API call if the cache is still valid (within TTL).
   * @param solutions the solutions of interest to break the metrics down by.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the metrics data.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshSalesMetrics(
    solutions: string[],
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseSalesDashboardMetricsDto[]) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${[...solutions].sort().join(',')}_${period}_${intervals ?? ''}`;
    const cached = this._cache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getSalesDashboardMetrics(solutions, period, intervals).subscribe({
      next: (metrics) => {
        this._cache.set(fetchKey, { data: metrics, timestamp: Date.now() });
        onData(metrics);
      },
      error: (error) => {
        console.error('Error refreshing sales metrics cache:', error);
        // Reads raise no toast of their own: without one the section would keep the figures of the previous selection.
        this._toasterService.showError('Non è stato possibile leggere le vendite.');
        onError?.();
      }
    });
  }

  /**
   * Fetches the Rocket half of the sales metrics for the given period, or reads it from the cache while still valid.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the metrics data.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshSalesOrdersMetrics(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseSalesOrdersDashboardMetricsDto) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${intervals ?? ''}`;
    const cached = this._ordersCache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getSalesOrdersDashboardMetrics(period, intervals).subscribe({
      next: (metrics) => {
        this._ordersCache.set(fetchKey, { data: metrics, timestamp: Date.now() });
        onData(metrics);
      },
      error: (error) => {
        console.error('Error refreshing sales orders metrics cache:', error);
        // Reads raise no toast of their own.
        this._toasterService.showError('Non è stato possibile leggere ordini ed erogazioni.');
        onError?.();
      }
    });
  }
}
