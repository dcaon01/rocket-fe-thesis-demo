import { Injectable, signal } from '@angular/core';

/** Available page size options shown in the items-per-page selector. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * Service holding the page size shared by every list of the application.
 * Each list keeps its own pages in a CursorPaginationService.
 */
@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  /** Writable signal holding the current items per page. */
  private _itemsPerPage = signal<number>(20);

  /** Readonly accessor for the items per page. */
  itemsPerPage = this._itemsPerPage.asReadonly();

  /**
   * Updates the number of items shown per page.
   * @param size the new page size.
   */
  setItemsPerPage(size: number): void {
    this._itemsPerPage.set(size);
  }
}
