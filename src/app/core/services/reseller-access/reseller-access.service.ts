import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, defer, EMPTY, map, merge, Observable, of, Subject, switchMap, take, throwError } from 'rxjs';
import { CoreResponseResellerAccessDto } from '../../../../../libs/api/src';
import { AccountApiService } from '../api-services/account/account-api.service';
import { ResellerContractsApiService } from '../api-services/reseller-contracts/reseller-contracts-api.service';
import { ResellersApiService } from '../api-services/resellers/resellers-api.service';

/** States of the access in which Rocket works for the users of a reseller. */
const WORKING_STATES: CoreResponseResellerAccessDto['state'][] = ['ACTIVE'];

/** How long a read of the access is trusted before a navigation reads it again. */
const ACCESS_MAX_AGE_MS = 60 * 1000;

/**
 * Service holding whether the logged-in reseller user can work in Rocket: without an active contract, or with an
 * invoice unpaid on the fifteenth day of its dunning, the navigations land on the blocking screen instead of the pages.
 * Keus collaborators are never blocked and never load it. Reads are serialized: a newer one drops the older, so a
 * late answer never brings back a state already left.
 */
@Injectable({
  providedIn: 'root'
})
export class ResellerAccessService {
  /** Account API service instance. */
  private readonly _accountApiService = inject(AccountApiService);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Reseller contracts API service instance. */
  private readonly _resellerContractsApiService = inject(ResellerContractsApiService);

  /** Identifier of the reseller of the logged-in user, once resolved. */
  private readonly _resellerId = signal<string | null>(null);

  /** Access state of the reseller of the logged-in user, null until loaded. */
  private readonly _access = signal<CoreResponseResellerAccessDto | null>(null);

  /** Whether the first read of the access ended, with or without an answer. */
  private readonly _loaded = signal<boolean>(false);

  /** Whether the access could never be read: Rocket stays covered until a read succeeds. */
  private readonly _unknown = signal<boolean>(false);

  /** When the access was last read, to skip a navigation read that is too close. */
  private _readAt = 0;

  /** Whether the reseller of the user is being resolved from its code, so a second load does not resolve it again. */
  private _resolving = false;

  /** Requests to read the access of a reseller, the newest one winning. */
  private readonly _reads = new Subject<string>();

  /** End of each read, with or without an answer. */
  private readonly _readEnded = new Subject<void>();

  /** Identifier of the reseller of the logged-in user, once resolved. */
  readonly resellerId = this._resellerId.asReadonly();

  /** Access state of the reseller of the logged-in user, null until loaded. */
  readonly access = this._access.asReadonly();

  /** Whether the first read of the access ended, with or without an answer. */
  readonly loaded = this._loaded.asReadonly();

  /** Whether the access could never be read. */
  readonly unknown = this._unknown.asReadonly();

  /** Whether Rocket is blocked for the logged-in user: also when its access could never be read, a failed reread keeps the state known. */
  readonly isBlocked = computed(() => {
    const access = this._access();
    return access ? !WORKING_STATES.includes(access.state) : this._unknown();
  });

  /**
   * Constructor that reads the access of each requested reseller, dropping a read still running when a newer comes.
   */
  constructor() {
    // The newest read wins.
    this._reads.pipe(
      switchMap(resellerId => this._resellerContractsApiService.getAccess(resellerId).pipe(
        catchError(error => {
          console.error('Error loading the access of the reseller:', error);
          this._unknown.set(!this._access());
          this._loaded.set(true);
          this._readEnded.next();
          return EMPTY;
        })
      ))
    ).subscribe(access => {
      this._access.set(access);
      this._unknown.set(false);
      this._loaded.set(true);
      this._readEnded.next();
    });
  }

  /**
   * Loads the access state of the reseller of the logged-in user, resolving the reseller from its code the first time.
   */
  load(): void {
    const resellerId = this._resellerId();
    if (resellerId) {
      this._readAt = Date.now();
      this._reads.next(resellerId);
      return;
    }
    if (this._resolving) return;

    this._resolving = true;
    this._accountApiService.currentUser$.pipe(
      take(1),
      switchMap(user => user.resellerCode
        ? this._resellersApiService.getResellerByCode(user.resellerCode)
        : throwError(() => new Error('Reseller user without a reseller code'))),
    ).subscribe({
      next: reseller => {
        this._resolving = false;
        this._resellerId.set(reseller.id);
        this._readAt = Date.now();
        this._reads.next(reseller.id);
      },
      error: error => {
        this._resolving = false;
        console.error('Error resolving the reseller of the user:', error);
        this._unknown.set(true);
        this._loaded.set(true);
        this._readEnded.next();
      }
    });
  }

  /**
   * Tells whether Rocket is blocked for the logged-in user: called at every navigation, it waits only for the first
   * read and then answers at once, reading again in the background when the last read is old. A block started during
   * the session shows at a later page.
   * @returns an observable emitting once whether Rocket is blocked.
   */
  blocked$(): Observable<boolean> {
    if (this._loaded()) {
      if (Date.now() - this._readAt >= ACCESS_MAX_AGE_MS) {
        this.load();
      }
      return of(this.isBlocked());
    }

    // Listen before reading, so a read ending at once is not missed.
    return merge(
      this._readEnded.pipe(take(1), map(() => this.isBlocked())),
      defer(() => {
        this.load();
        return EMPTY;
      })
    ).pipe(take(1));
  }
}
