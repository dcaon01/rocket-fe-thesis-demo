import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucidePencil, lucidePlus, lucideRefreshCw, lucideTrash2, lucideInbox, lucideCalendarCog, lucideMail, lucideEye } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmError, HlmHint } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { finalize, map } from 'rxjs';
import { CoreResponseTrialDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { DateRangeFilterComponent } from '../../../../components/date-range-filter/date-range-filter.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { TrialStatusDirective } from '../../../../directives/trial-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { TrialStatus } from '../../../../enums/trial-status.enum';
import { TrialStatusPipe } from '../../../../pipes/trial-status/trial-status.pipe';
import { ResellerOwnerPipe } from '../../../../pipes/reseller-owner/reseller-owner.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { DateRange } from '../../../../interfaces/date-range.interface';
import { TrialsApiService, TrialsFilters } from '../../../../services/api-services/trials/trials-api.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { endOfDay, hasEmptySelection, orUndefined, sameFilters, startOfDay } from '../../../../utils/filters.util';
import { FilterTrialsForm } from '../../interfaces/filter-trials-form.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Values of the trial filters. */
type TrialFilterValues = ReturnType<FormGroup<FilterTrialsForm>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back. */
const DEFAULT_TRIAL_FILTERS: TrialFilterValues = { email: null, dateType: 'activatedAt', period: { from: null, to: null }, status: null };

@Component({
  selector: 'rocket-trials',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmTableImports,
    ...HlmLabelImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmSelectImports,
    ...HlmTooltipImports,
    ...BrnSelectImports,
    PageHeaderComponent,
    DateRangeFilterComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    NgIcon,
    ReactiveFormsModule,
    HlmHint,
    TrialStatusPipe,
    TrialStatusDirective,
    HlmError,
    ResellerOwnerPipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideEye, lucideCalendarCog, lucideMail, lucideInbox,
      lucidePlus,
      lucidePencil,
      lucideTrash2,
      lucideRefreshCw
    })
  ],
  templateUrl: './trials.component.html',
  styleUrl: './trials.component.css'
})
export class TrialsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Router instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Pages of the trials. */
  readonly pager = inject<CursorPaginationService<CoreResponseTrialDto>>(CursorPaginationService);

  /** Trials API service instance. */
  private readonly _trialsApiService = inject(TrialsApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the user sees which reseller manages each record. */
  readonly canViewOwnership = computed(() => this._permissions.can(Capability.ViewResellerOwnership));

  /** Whether the user can create and edit trials. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageTrials));

  /** Whether the user can delete trials. */
  readonly canDelete = computed(() => this._permissions.can(Capability.DeleteTrials));

  /** Trial statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(TrialStatus).map(status => ({ value: status, label: new TrialStatusPipe().transform(status) }));

  /** Form group for filtering trials. */
  trialsFilterForm = new FormGroup<FilterTrialsForm>({
    email: new FormControl<string | null>(DEFAULT_TRIAL_FILTERS.email),
    dateType: new FormControl<string | null>(DEFAULT_TRIAL_FILTERS.dateType),
    period: new FormControl<DateRange | null>(DEFAULT_TRIAL_FILTERS.period),
    status: new FormControl<string[] | null>(DEFAULT_TRIAL_FILTERS.status),
  });

  /** Filters applied to the list. */
  appliedFilters = signal<TrialFilterValues>(DEFAULT_TRIAL_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.trialsFilterForm.valueChanges.pipe(map(() => this.trialsFilterForm.getRawValue())),
    { initialValue: this.trialsFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_TRIAL_FILTERS));

  /** Loading state signal. */
  isLoading = signal<boolean>(false);

  /** Refresh cooldown signal (seconds remaining). */
  refreshCooldown = signal<number>(0);

  /** Form group for deleting a trial. */
  deleteForm = new FormGroup({
    email: new FormControl<string>('', [Validators.required])
  });

  /** Error message signal for delete trial form. */
  errorMessage = signal<string | null>(null);

  /** Selected trial. */
  selectedTrial: CoreResponseTrialDto | null = null;

  /** Dialog reference. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Dialog content reference. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page whenever the applied filters change.
    effect(() => {
      const filters = this.appliedFilters();
      const productId = this._activatedRoute.snapshot.paramMap.get('productId') || '';

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._trialsApiService.listTrials(page, { productId, ...this._toQuery(filters) })));
    });

    // Manage dialog state changes.
    effect(() => {
      const state = this.dialogContent()?.state();
      if (state === 'closed') {
        this.closeDeleteTrialDialog();
      }
    });
  }

  /**
   * Reads the current page again.
   */
  loadTrials(): void {
    this.pager.reload();
  }

  /**
   * Refreshes trials with a 5 second cooldown.
   */
  refreshTrials(): void {
    this.refreshCooldown.set(5);
    this.loadTrials();
    const interval = setInterval(() => {
      const remaining = this.refreshCooldown() - 1;
      this.refreshCooldown.set(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.trialsFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.trialsFilterForm.reset(DEFAULT_TRIAL_FILTERS);
    this.appliedFilters.set(DEFAULT_TRIAL_FILTERS);
  }

  /**
   * Navigates to the trial creation page.
   */
  goToCreateTrial(): void {
    this._router.navigate(['create'], { relativeTo: this._activatedRoute });
  }

  /**
   * Go to edit trial page.
   * @param trialId the identifier of the trial to edit.
   */
  goToEditTrial(trialId: string): void {
    this._router.navigate(['edit', trialId], { relativeTo: this._activatedRoute });
  }

  /**
   * Opens the delete trial dialog.
   * @param trialId the identifier of the trial.
   */
  openDeleteTrialDialog(trialId: string): void {
    this.selectedTrial = this.pager.items().find(t => t.id === trialId) || null;
    this.dialog()?.open();
  }

  /**
   * Deletes the selected trial.
   */
  deleteTrial(): void {
    const productId = this._activatedRoute.snapshot.paramMap.get('productId') || '';
    const input = this.deleteForm.value;
    if (!this.selectedTrial) return;

    if (input.email === this.selectedTrial.associatedEmail) {
      this.isLoading.set(true);
      this._trialsApiService.deleteTrial(productId, this.selectedTrial.id).pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.closeDeleteTrialDialog();
          this.loadTrials();
        })
      ).subscribe();
    } else {
      this.deleteForm.reset();
      this.errorMessage.set('L\'email non corrisponde.');
    }
  }

  /**
   * Closes the delete trial dialog.
   */
  closeDeleteTrialDialog(): void {
    this.selectedTrial = null;
    this.deleteForm.reset();
    this.errorMessage.set(null);
    this.dialog()?.close();
  }

  /**
   * Formats a date string for display in the table.
   * @param dateString the date string to format.
   * @returns the formatted date.
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  /**
   * Turns the filter values into the query of the listing.
   * @param filters the filter values.
   * @returns the query.
   */
  private _toQuery(filters: TrialFilterValues): Omit<TrialsFilters, 'productId'> {
    return {
      search: orUndefined(filters.email),
      status: orUndefined(filters.status) as TrialsFilters['status'],
      dateField: filters.dateType as TrialsFilters['dateField'],
      from: startOfDay(filters.period?.from),
      to: endOfDay(filters.period?.to),
    };
  }
}
