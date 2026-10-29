import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, map, Observable, of, skip, Subject, switchMap } from 'rxjs';
import { Page, PageRequest } from '../../interfaces/page.interface';
import { ToasterService } from '../toaster/toaster.service';
import { PaginationService } from './pagination.service';

/** Reads one page of a list from the backend. */
export type PageFetcher<T> = (page: PageRequest) => Observable<Page<T>>;

/**
 * Service holding the pages of one list, read from the backend with a cursor.
 * Provided by each list component, so every list keeps its own pages; the page size is the shared one.
 * Usage: providers: [CursorPaginationService], then pager.load(page => api.listX(page, filters)).
 */
@Injectable()
export class CursorPaginationService<T> {
  /** Shared page size service. */
  private readonly _paginationService = inject(PaginationService);

  /** Toaster service, to report a page that could not be read. */
  private readonly _toasterService = inject(ToasterService);

  /** Reader of the current list, set by load(). */
  private _fetch: PageFetcher<T> | null = null;

  /** Cursor of each page read so far: the first page has none. */
  private _cursors: (string | undefined)[] = [undefined];

  /** Pages to read, one request at a time: a newer one cancels the older. */
  private readonly _requests = new Subject<number>();

  /** Items of the current page. */
  private readonly _items = signal<T[]>([]);

  /** Readonly accessor for the items of the current page. */
  readonly items = this._items.asReadonly();

  /** Number of the current page, from 1. */
  private readonly _page = signal<number>(1);

  /** Readonly accessor for the number of the current page. */
  readonly page = this._page.asReadonly();

  /** Cursor of the next page, absent on the last one. */
  private readonly _nextCursor = signal<string | undefined>(undefined);

  /** Whether a first page has been read. */
  private readonly _loaded = signal<boolean>(false);

  /** Readonly accessor for whether a first page has been read. */
  readonly loaded = this._loaded.asReadonly();

  /** Whether there is a page after the current one. */
  readonly hasNext = computed(() => !!this._nextCursor());

  /** Whether there is a page before the current one. */
  readonly hasPrevious = computed(() => this._page() > 1);

  /**
   * Constructor of the service.
   */
  constructor() {
    // Read the requested pages, keeping only the latest request.
    this._requests.pipe(
      switchMap(page => this._fetch!({ limit: this._paginationService.itemsPerPage(), cursor: this._cursors[page - 1] }).pipe(
        map(result => ({ page, result })),
        // The interceptor does not report failed reads: the list keeps its page and says so.
        catchError(() => {
          this._toasterService.showError('Non è stato possibile caricare la lista. Riprova.');
          return EMPTY;
        }),
      )),
      takeUntilDestroyed(),
    ).subscribe(({ page, result }) => {
      this._items.set(result.items);
      this._nextCursor.set(result.nextCursor);
      this._page.set(page);
      this._loaded.set(true);
    });

    // Restart from the first page when the shared page size changes.
    toObservable(this._paginationService.itemsPerPage).pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.restart());
  }

  /**
   * Sets how the list is read and reads its first page.
   * @param fetch the reader of a page, with the filters of the list.
   */
  load(fetch: PageFetcher<T>): void {
    this._fetch = fetch;
    this.restart();
  }

  /**
   * Empties the list without reading it, for filters that match nothing.
   */
  clear(): void {
    this.load(() => of({ items: [] }));
  }

  /**
   * Reads the list again from its first page.
   */
  restart(): void {
    if (!this._fetch) return;
    this._cursors = [undefined];
    this._requests.next(1);
  }

  /**
   * Reads the current page again, after a change to one of its items.
   */
  reload(): void {
    if (!this._fetch) return;
    this._requests.next(this._page());
  }

  /**
   * Reads the next page, when there is one.
   */
  next(): void {
    const cursor = this._nextCursor();
    if (!this._fetch || !cursor) return;
    this._cursors[this._page()] = cursor;
    this._requests.next(this._page() + 1);
  }

  /**
   * Reads the previous page, when there is one.
   */
  previous(): void {
    if (!this._fetch || this._page() === 1) return;
    this._requests.next(this._page() - 1);
  }
}
