import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CursorPaginationService } from '../../services/pagination/cursor-pagination.service';
import { PageSizeSelectorComponent } from '../page-size-selector/page-size-selector.component';

/**
 * Footer of a paginated table: the shared page size, the current page and the chevrons that exist.
 * Usage: <rocket-table-pagination [pager]="pager" />
 */
@Component({
  selector: 'rocket-table-pagination',
  imports: [
    ...HlmButtonImports,
    ...HlmIconImports,
    ...HlmTooltipImports,
    PageSizeSelectorComponent,
    NgIcon,
  ],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  templateUrl: './table-pagination.component.html',
})
export class TablePaginationComponent {
  /** Pages of the list the footer moves through. */
  pager = input.required<CursorPaginationService<unknown>>();
}
