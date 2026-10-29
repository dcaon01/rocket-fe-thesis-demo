import { inject, Injectable } from '@angular/core';
import { finalize, Observable, shareReplay, tap } from 'rxjs';
import { CoreResponseActiveCompaniesPeriodRecordDto, CoreResponseResellerNetworkEntryDto } from '../../../../../libs/api/src';
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
 * Service to cache the active companies and the reseller network of the global and product dashboards.
 * Each parameter combination is cached independently with a 5-minute TTL. The network is read by two sections of the
 * global dashboard at once, so a read in flight is shared: one request and one error toast.
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached active companies. */
  private readonly _companiesCache = new Map<string, CacheEntry<CoreResponseActiveCompaniesPeriodRecordDto[]>>();

  /** Map of period → cached reseller network. */
  private readonly _networkCache = new Map<string, CacheEntry<CoreResponseResellerNetworkEntryDto[]>>();

  /** Map of period → reseller network read in flight. */
  private readonly _networkInFlight = new Map<string, Observable<CoreResponseResellerNetworkEntryDto[]>>();

  /**
   * Fetches the active companies and updates the cache, or hands back the cached data within the TTL.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the active companies records.
   * @param intervals optional number of intervals to retrieve.
   * @param productId optional product read, absent for every product.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshActiveCompanies(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseActiveCompaniesPeriodRecordDto[]) => void,
    intervals?: number,
    productId?: string,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${intervals ?? ''}_${productId ?? ''}`;
    const cached = this._companiesCache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getActiveCompaniesDashboardMetrics(period, intervals, productId).subscribe({
      next: (records) => {
        this._companiesCache.set(fetchKey, { data: records, timestamp: Date.now() });
        onData(records);
      },
      error: (error) => {
        console.error('Error refreshing active companies cache:', error);
        // Reads raise no toast of their own.
        this._toasterService.showError('Non è stato possibile leggere le aziende attive.');
        onError?.();
      }
    });
  }

  /**
   * Fetches the reseller network and updates the cache, or hands back the cached data within the TTL.
   * @param period the current period of the licenses ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the reseller network entries.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshResellerNetwork(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseResellerNetworkEntryDto[]) => void,
    onError?: () => void,
  ): void {
    const cached = this._networkCache.get(period);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    let request = this._networkInFlight.get(period);
    if (!request) {
      request = this._metricsApiService.getResellerNetworkDashboardMetrics(period).pipe(
        tap({
          next: entries => this._networkCache.set(period, { data: entries, timestamp: Date.now() }),
          error: (error: unknown) => {
            console.error('Error refreshing reseller network cache:', error);
            // Reads raise no toast of their own.
            this._toasterService.showError('Non è stato possibile leggere la rete dei rivenditori.');
          },
        }),
        finalize(() => this._networkInFlight.delete(period)),
        shareReplay(1),
      );
      this._networkInFlight.set(period, request);
    }

    request.subscribe({
      next: entries => onData(entries),
      error: () => onError?.(),
    });
  }
}
