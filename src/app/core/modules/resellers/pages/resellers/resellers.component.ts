import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideFolderOpen, lucidePencil, lucidePlus, lucideTags, lucideTrash2, lucideInbox, lucideMail, lucideSearch } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { CoreResponseResellerDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { STATUS_COLORS } from '../../../../constants/status-colors';
import { ResellerStatusDirective } from '../../../../directives/reseller-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { ResellersApiService, ResellersFilters } from '../../../../services/api-services/resellers/resellers-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterResellers } from '../../interfaces/filter-resellers.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Values of the reseller filters. */
type ResellerFilterValues = ReturnType<FormGroup<FilterResellers>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back: archived resellers only when asked for. */
const DEFAULT_RESELLER_FILTERS: ResellerFilterValues = { companyName: null, email: null, status: ['ACTIVE', 'INACTIVE'] };

@Component({
  selector: 'rocket-resellers',
  imports: [
    ...HlmInputGroupImports,
    ...HlmAvatarImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmTableImports,
    ...HlmDialogImports,
    ...HlmTooltipImports,
    ...BrnDialogImports,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    NgIcon,
    ReactiveFormsModule,
    ResellerStatusDirective,
    DatePipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideMail, lucideSearch, lucideInbox,
      lucidePlus,
      lucideTags,
      lucideFolderOpen,
      lucidePencil,
      lucideTrash2
    })
  ],
  templateUrl: './resellers.component.html',
  styleUrl: './resellers.component.css'
})
export class ResellersComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Pages of the resellers. */
  readonly pager = inject<CursorPaginationService<CoreResponseResellerDto>>(CursorPaginationService);

  /** Colors of the mark of a reseller with unpaid invoices. */
  readonly overdueBadgeClass = STATUS_COLORS.negative;

  /** Dialog reference. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Dialog content reference. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /** Reseller statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = [{ value: 'ACTIVE', label: 'Attivo' }, { value: 'INACTIVE', label: 'Non attivo' }, { value: 'ARCHIVED', label: 'Archiviato' }];

  /** Form group for filtering resellers. */
  resellersFilterForm = new FormGroup<FilterResellers>({
    companyName: new FormControl<string | null>(DEFAULT_RESELLER_FILTERS.companyName),
    email: new FormControl<string | null>(DEFAULT_RESELLER_FILTERS.email),
    status: new FormControl<string[] | null>(DEFAULT_RESELLER_FILTERS.status)
  });

  /** Filters applied to the list. */
  appliedFilters = signal<ResellerFilterValues>(DEFAULT_RESELLER_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.resellersFilterForm.valueChanges.pipe(map(() => this.resellersFilterForm.getRawValue())),
    { initialValue: this.resellersFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_RESELLER_FILTERS));

  /** Whether the user can create resellers. */
  readonly canCreate = computed(() => this._permissions.can(Capability.ManageResellers));

  /** Whether the user can delete resellers. */
  readonly canDelete = computed(() => this._permissions.can(Capability.DeleteResellers));

  /** Whether the user can configure the commercial tiers. */
  readonly canManageTiers = computed(() => this._permissions.can(Capability.ManageResellerTiers));

  /** Presigned download URLs for reseller logos, keyed by S3 key. */
  logoUrls = signal<Record<string, string>>({});

  /** Selected reseller for deletion. */
  selectedReseller: CoreResponseResellerDto | null = null;

  /** Loading signal. */
  isLoading = signal<boolean>(false);

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page whenever the applied filters change.
    effect(() => {
      const { companyName, email, status } = this.appliedFilters();

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._resellersApiService.listResellers(page, {
        companyName: orUndefined(companyName),
        email: orUndefined(email),
        status: orUndefined(status) as ResellersFilters['status'],
      })));
    });

    // Load presigned URLs for reseller logos.
    effect(() => {
      const s3Keys = this.pager.items()
        .map(r => r.logoS3Key)
        .filter((key): key is string => !!key);

      if (s3Keys.length === 0) return;

      const requests: Record<string, ReturnType<S3UploadService['getDownloadUrl']>> = {};
      for (const key of s3Keys) {
        requests[key] = this._s3UploadService.getDownloadUrl('RESELLER_LOGO', key).pipe(catchError(() => of('')));
      }

      forkJoin(requests).subscribe(urls => {
        this.logoUrls.set(urls);
      });
    });

    // Manage dialog state changes.
    effect(() => {
      const state = this.dialogContent()?.state();
      if (state === 'closed') {
        this.closeDeleteResellerDialog();
      }
    });
  }

  /**
   * Reads the current page again.
   */
  loadResellers(): void {
    this.pager.reload();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.resellersFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.resellersFilterForm.reset(DEFAULT_RESELLER_FILTERS);
    this.appliedFilters.set(DEFAULT_RESELLER_FILTERS);
  }

  /**
   * Gets the logo URL for a reseller from the cached presigned URLs.
   * @param s3Key the S3 key.
   * @returns the presigned URL or null if not available.
   */
  getLogoUrl(s3Key: string | undefined): string | null {
    if (!s3Key) return null;
    return this.logoUrls()[s3Key] ?? null;
  }

  /**
   * Gets the initials of the company name, used when the reseller has no logo.
   * @param companyName the company name.
   * @returns the first letters of the first two words, uppercase.
   */
  getInitials(companyName: string): string {
    return companyName.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }

  /**
   * Navigate to the reseller creation page.
   */
  goToCreateReseller(): void {
    this._router.navigate(['/resellers/create']);
  }

  /**
   * Go to the commercial tiers page.
   */
  goToTiers(): void {
    this._router.navigate(['/resellers/tiers']);
  }

  /**
   * Go to the edit reseller page.
   * @param resellerId the reseller identifier.
   */
  goToEditReseller(resellerId: string): void {
    this._router.navigate([`/resellers/edit/${resellerId}`]);
  }

  /**
   * Enters the workspace of a reseller.
   * Same mechanics as the product workspace: from the list you step into the
   * perimeter of one reseller and the sidebar changes with it.
   * @param resellerId the reseller identifier.
   */
  goToResellerWorkspace(resellerId: string): void {
    this._router.navigate([`/resellers/workspaces/${resellerId}`]);
  }

  /**
   * Get the status label based on the reseller's status.
   * @param status The reseller's status.
   * @returns the localized status label.
   */
  getStatus(status?: CoreResponseResellerDto['status']): string {
    switch (status) {
      case 'ACTIVE': return 'Attivo';
      case 'SUSPENDED': return 'Sospeso';
      case 'INACTIVE': return 'Non attivo';
      case 'ARCHIVED': return 'Archiviato';
      default: return '-';
    }
  }

  /**
   * Opens the delete reseller confirmation dialog.
   * @param resellerId the identifier of the reseller.
   */
  openDeleteResellerDialog(resellerId: string): void {
    this.selectedReseller = this.pager.items().find(r => r.id === resellerId) || null;
    this.dialog()?.open();
  }

  /**
   * Closes the delete reseller confirmation dialog.
   */
  closeDeleteResellerDialog(): void {
    this.selectedReseller = null;
    this.dialog()?.close();
  }

  /**
   * Deletes a reseller.
   */
  deleteReseller(): void {
    if (!this.selectedReseller) return;

    this.isLoading.set(true);
    this._resellersApiService.deleteReseller(this.selectedReseller.id).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.closeDeleteResellerDialog();
        this.loadResellers();
      })
    ).subscribe();
  }
}
