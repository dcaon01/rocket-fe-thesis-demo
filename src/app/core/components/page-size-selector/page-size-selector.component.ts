import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { PAGE_SIZE_OPTIONS, PaginationService } from '../../services/pagination/pagination.service';

/**
 * Small selector that lets the user change the number of items displayed per page.
 * Reads and writes directly from the shared PaginationService.
 */
@Component({
  selector: 'rocket-page-size-selector',
  imports: [
    ...HlmSelectImports,
    ...BrnSelectImports,
    FormsModule
  ],
  templateUrl: './page-size-selector.component.html'
})
export class PageSizeSelectorComponent {
  /** Injected pagination service used to read and update the page size. */
  private readonly _paginationService = inject(PaginationService);

  /** Current items per page, bound to the select. */
  pageSize = this._paginationService.itemsPerPage;

  /** List of selectable page sizes. */
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  /**
   * Updates the shared pagination service with the newly selected page size.
   * @param value the new page size chosen by the user.
   */
  onChange(value: number | string): void {
    this._paginationService.setItemsPerPage(Number(value));
  }
}
