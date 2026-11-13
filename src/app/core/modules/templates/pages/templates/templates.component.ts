import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideEye, lucidePencil, lucidePlus, lucideTrash2, lucideInbox, lucideSearch } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { finalize, map } from 'rxjs';
import { CoreResponseTemplateDto } from '../../../../../../../libs/api/src';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { TemplateStatusDirective } from '../../../../directives/template-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { TemplateStatus } from '../../../../enums/template-status.enum';
import { TemplateType } from '../../../../enums/template-type.enum';
import { SalesChannelPipe } from '../../../../pipes/sales-channel/sales-channel.pipe';
import { TemplateStatusPipe } from '../../../../pipes/template-status/template-status.pipe';
import { TemplateTypePipe } from '../../../../pipes/template-type/template-type.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { TemplatesApiService, TemplatesFilters } from '../../../../services/api-services/templates/templates-api.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterTemplatesForm } from '../../interfaces/filter-templates-form.interface';

/** Values of the template filters. */
type TemplateFilterValues = ReturnType<FormGroup<FilterTemplatesForm>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back: withdrawn templates only when asked for. */
const DEFAULT_TEMPLATE_FILTERS: TemplateFilterValues = { search: null, type: null, status: [TemplateStatus.Draft, TemplateStatus.Published] };

/**
 * Template list of every type of document, filtered by type, status and name.
 */
@Component({
  selector: 'rocket-templates',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    TemplateStatusDirective,
    NgIcon,
    DatePipe,
    SalesChannelPipe,
    TemplateStatusPipe,
    TemplateTypePipe,
    ReactiveFormsModule,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideSearch, lucideInbox,
      lucideEye,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
    })
  ],
  templateUrl: './templates.component.html',
})
export class TemplatesComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Templates API service instance. */
  private readonly _templatesApiService = inject(TemplatesApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Pages of the templates. */
  readonly pager = inject<CursorPaginationService<CoreResponseTemplateDto>>(CursorPaginationService);

  /** Delete dialog reference. */
  deleteDialog = viewChild<BrnDialog>('deleteDialog');

  /** Template types offered by the type filter. */
  typeOptions: ComboboxOption[] = Object.values(TemplateType).map(type => ({ value: type, label: new TemplateTypePipe().transform(type) }));

  /** Template statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(TemplateStatus).map(status => ({ value: status, label: new TemplateStatusPipe().transform(status) }));

  /** Form group for filtering the templates. */
  templatesFilterForm = new FormGroup<FilterTemplatesForm>({
    search: new FormControl<string | null>(DEFAULT_TEMPLATE_FILTERS.search),
    type: new FormControl<string[] | null>(DEFAULT_TEMPLATE_FILTERS.type),
    status: new FormControl<string[] | null>(DEFAULT_TEMPLATE_FILTERS.status),
  });

  /** Filters applied to the list. */
  appliedFilters = signal<TemplateFilterValues>(DEFAULT_TEMPLATE_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.templatesFilterForm.valueChanges.pipe(map(() => this.templatesFilterForm.getRawValue())),
    { initialValue: this.templatesFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_TEMPLATE_FILTERS));

  /** Whether the user can create, edit and publish templates. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageTemplates));

  /** Template selected for deletion. */
  selectedTemplate = signal<CoreResponseTemplateDto | null>(null);

  /** Loading state signal. */
  isLoading = signal<boolean>(false);

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page whenever the applied filters change.
    effect(() => {
      const { search, type, status } = this.appliedFilters();

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._templatesApiService.listTemplates(page, {
        type: orUndefined(type) as TemplatesFilters['type'],
        name: orUndefined(search),
        status: orUndefined(status) as TemplatesFilters['status'],
      })));
    });
  }

  /**
   * Reads the current page again.
   */
  loadTemplates(): void {
    this.pager.reload();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.templatesFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.templatesFilterForm.reset(DEFAULT_TEMPLATE_FILTERS);
    this.appliedFilters.set(DEFAULT_TEMPLATE_FILTERS);
  }

  /**
   * Navigates to the template creation page, preset on the type when the filter holds only one.
   */
  goToCreateTemplate(): void {
    const type = this.appliedFilters().type;
    this._router.navigate(['create'], { relativeTo: this._activatedRoute, queryParams: type?.length === 1 ? { type: type[0] } : {} });
  }

  /**
   * Navigates to the template page.
   * @param template the template to open.
   */
  goToTemplate(template: CoreResponseTemplateDto): void {
    this._router.navigate(['edit', template.type, template.id], { relativeTo: this._activatedRoute });
  }

  /**
   * Opens the delete confirmation dialog.
   * @param template the draft to delete.
   */
  openDeleteDialog(template: CoreResponseTemplateDto): void {
    this.selectedTemplate.set(template);
    this.deleteDialog()?.open();
  }

  /**
   * Closes the delete confirmation dialog.
   */
  closeDeleteDialog(): void {
    this.selectedTemplate.set(null);
    this.deleteDialog()?.close();
  }

  /**
   * Deletes the selected draft together with its DOCX source.
   */
  deleteTemplate(): void {
    const template = this.selectedTemplate();
    if (!template) return;

    this.isLoading.set(true);
    this._templatesApiService.deleteTemplate(template.type, template.id).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.closeDeleteDialog();
        this.pager.reload();
      })
    ).subscribe();
  }
}
