import { computed, Injectable, signal } from '@angular/core';

/**
 * Service that tells whether any request is still running, for the loading overlay. It counts the requests in
 * flight, so the overlay stays on until the last of several parallel requests ends.
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  /** Requests in flight. */
  private readonly _pending = signal<number>(0);

  /** Whether any request is still running. */
  readonly isLoading = computed(() => this._pending() > 0);

  /**
   * Records the start or the end of a request.
   * @param loading true when a request starts, false when it ends.
   */
  setLoading(loading: boolean): void {
    this._pending.update(pending => Math.max(0, pending + (loading ? 1 : -1)));
  }
}
