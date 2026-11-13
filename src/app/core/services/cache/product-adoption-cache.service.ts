import { inject, Injectable } from '@angular/core';
import { CoreResponseMixpanelTenantKpiDto, CoreResponseProductAdoptionPeriodRecordDto } from '../../../../../libs/api/src';
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
 * Service to cache the product adoption metrics read from Mixpanel for five minutes: the counts per period, shared
 * by the global page and the product workspaces, and the outcomes per tenant, one entry per period and product.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductAdoptionCacheService {
  /** Metrics API service instance. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Toaster service instance, for the failed reads. */
  private readonly _toasterService = inject(ToasterService);

  /** Map of fetch key → cached adoption records. */
  private readonly _cache = new Map<string, CacheEntry<CoreResponseProductAdoptionPeriodRecordDto[]>>();

  /** Map of fetch key → cached outcomes per tenant. */
  private readonly _tenantsCache = new Map<string, CacheEntry<CoreResponseMixpanelTenantKpiDto[]>>();

  /**
   * Fetches the adoption counts for the given period, or reads them from the cache while still valid.
   * @param period the time period ('ANNUAL' or 'MONTHLY').
   * @param onData callback invoked with the adoption records.
   * @param intervals optional number of intervals to retrieve.
   * @param onError callback invoked when the read fails, so the caller drops the figures of the previous selection.
   */
  refreshAdoptionMetrics(
    period: 'ANNUAL' | 'MONTHLY',
    onData: (data: CoreResponseProductAdoptionPeriodRecordDto[]) => void,
    intervals?: number,
    onError?: () => void,
  ): void {
    const fetchKey = `${period}_${intervals ?? ''}`;
    const cached = this._cache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getProductAdoptionDashboardMetrics(period, intervals).subscribe({
      next: (records) => {
        this._cache.set(fetchKey, { data: records, timestamp: Date.now() });
        onData(records);
      },
      error: (error) => {
        console.error('Error refreshing product adoption metrics cache:', error);
        // Reads raise no toast of their own.
        this._toasterService.showError("Non è stato possibile leggere le metriche d'uso del prodotto.");
        onError?.();
      }
    });
  }

  /**
   * Fetches the outcomes of the tenants on the last day of a period, or reads them from the cache.
   * @param from the first day of the period (YYYY-MM-DD).
   * @param to the last day of the period (YYYY-MM-DD).
   * @param productId the product whose tenants are read, undefined for every product.
   * @param onData callback invoked with the outcomes per tenant.
   * @param onError callback invoked when the read fails.
   * @param resellerId the reseller whose tenants are read, undefined for the perimeter of the user.
   */
  refreshTenantOutcomes(
    from: string,
    to: string,
    productId: string | undefined,
    onData: (data: CoreResponseMixpanelTenantKpiDto[]) => void,
    onError?: () => void,
    resellerId?: string,
  ): void {
    const fetchKey = `${from}_${to}_${productId ?? ''}_${resellerId ?? ''}`;
    const cached = this._tenantsCache.get(fetchKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      onData(cached.data);
      return;
    }

    this._metricsApiService.getMixpanelTenantKpi(from, to, productId, resellerId).subscribe({
      next: (rows) => {
        this._tenantsCache.set(fetchKey, { data: rows, timestamp: Date.now() });
        onData(rows);
      },
      error: (error) => {
        console.error('Error refreshing tenant outcomes cache:', error);
        this._toasterService.showError('Non è stato possibile leggere gli esiti delle aziende.');
        onError?.();
      }
    });
  }
}
