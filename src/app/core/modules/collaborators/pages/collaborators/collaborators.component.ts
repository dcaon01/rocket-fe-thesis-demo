import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucidePencil, lucidePlus, lucideInbox, lucideTrash2, lucideMail, lucideSearch } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { CognitoCollaboratorResponseDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { CollaboratorStatusDirective } from '../../../../directives/collaborator-status.directive';
import { AccountType } from '../../../../enums/account-type.enum';
import { Capability } from '../../../../enums/capability.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { CollaboratorsApiService } from '../../../../services/api-services/collaborators/collaborators-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { RolePipe } from '../../../../pipes/roles/role.pipe';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterCollaboratorsForm } from '../../interfaces/filter-collaborators-form.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Values of the collaborator filters. */
type CollaboratorFilterValues = ReturnType<FormGroup<FilterCollaboratorsForm>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back. */
const DEFAULT_COLLABORATOR_FILTERS: CollaboratorFilterValues = { name: null, email: null, status: null };

@Component({
  selector: 'rocket-collaborators',
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
    CollaboratorStatusDirective,
    RolePipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideMail, lucideSearch, lucideInbox,
      lucidePlus,
      lucidePencil,
      lucideTrash2
    })
  ],
  templateUrl: './collaborators.component.html',
  styleUrl: './collaborators.component.css'
})
export class CollaboratorsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Application context service. */
  private readonly _context = inject(AppContextService);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Collaborators Service. */
  private readonly _collaboratorsService = inject(CollaboratorsApiService);

  /** S3 Upload Service. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Pages of the collaborators. */
  readonly pager = inject<CursorPaginationService<CognitoCollaboratorResponseDto>>(CursorPaginationService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Delete confirmation dialog. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Content of the delete confirmation dialog, read for its state. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /** Collaborator awaiting the delete confirmation. */
  selectedCollaborator = signal<CognitoCollaboratorResponseDto | null>(null);

  /** Loading signal for the deletion. */
  isLoading = signal<boolean>(false);

  /** Whether the user can delete collaborators. */
  readonly canDelete = computed(() => this._permissions.can(Capability.ManageCollaborators));

  /** Whether the page is opened inside a reseller workspace. */
  readonly isResellerWorkspace = computed(() => !!this._context.resellerId());

  /** Code of the reseller whose workspace is open, to list its collaborators only. */
  private readonly _resellerCode = toSignal(
    toObservable(this._context.resellerId).pipe(
      switchMap(resellerId => resellerId
        ? this._resellersApiService.getReseller(resellerId).pipe(map(reseller => reseller.code))
        : of(null)),
    ),
    { initialValue: null },
  );

  /** Cognito sub of the logged-in user, whose row cannot be managed. */
  readonly currentSub = this._permissions.sub;

  /** Presigned download URLs for collaborator avatars, keyed by S3 key. */
  avatarUrls = signal<Record<string, string>>({});

  /** Collaborator statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = [{ value: 'ACTIVE', label: 'Attivo' }, { value: 'INACTIVE', label: 'Non attivo' }];

  /** Form group for filtering collaborators. */
  collaboratorsFilterForm = new FormGroup<FilterCollaboratorsForm>({
    name: new FormControl<string | null>(DEFAULT_COLLABORATOR_FILTERS.name),
    email: new FormControl<string | null>(DEFAULT_COLLABORATOR_FILTERS.email),
    status: new FormControl<string[] | null>(DEFAULT_COLLABORATOR_FILTERS.status)
  });

  /** Filters applied to the list. */
  appliedFilters = signal<CollaboratorFilterValues>(DEFAULT_COLLABORATOR_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.collaboratorsFilterForm.valueChanges.pipe(map(() => this.collaboratorsFilterForm.getRawValue())),
    { initialValue: this.collaboratorsFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_COLLABORATOR_FILTERS));

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page whenever the applied filters or the reseller of the workspace change.
    effect(() => {
      const { name, email, status } = this.appliedFilters();
      const resellerCode = this._resellerCode();
      if (this.isResellerWorkspace() && !resellerCode) return;

      // A single status picked narrows the list; «Tutti» or both mean every collaborator.
      const enabled = status?.length === 1 ? status[0] === 'ACTIVE' : undefined;
      // The global area lists the Keus accounts, a reseller workspace the collaborators of its reseller.
      const area = resellerCode ? { resellerCode } : { accountType: AccountType.Collaborator };

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._collaboratorsService.listCollaborators(page, {
        name: orUndefined(name),
        email: orUndefined(email),
        enabled,
        ...area,
      })));
    });

    // Reset the selection when the delete dialog closes.
    effect(() => {
      if (this.dialogContent()?.state() === 'closed') {
        this.closeDeleteCollaboratorDialog();
      }
    });

    // Load presigned URLs for collaborator avatars.
    effect(() => {
      const s3Keys = this.pager.items()
        .map(c => c.profilePicS3Key)
        .filter((key): key is string => !!key);

      if (s3Keys.length === 0) return;

      const requests: Record<string, ReturnType<S3UploadService['getDownloadUrlCognito']>> = {};
      for (const key of s3Keys) {
        requests[key] = this._s3UploadService.getDownloadUrlCognito(key);
      }

      forkJoin(requests).subscribe(urls => {
        this.avatarUrls.set(urls);
      });
    });

  }

  /**
   * Reads the current page again.
   */
  loadCollaborators(): void {
    this.pager.reload();
  }

  /**
   * Opens the delete confirmation dialog, only for a deactivated collaborator.
   * @param collaborator the collaborator to delete.
   */
  openDeleteCollaboratorDialog(collaborator: CognitoCollaboratorResponseDto): void {
    if (collaborator.enabled) return;
    this.selectedCollaborator.set(collaborator);
    this.dialog()?.open();
  }

  /**
   * Closes the delete confirmation dialog.
   */
  closeDeleteCollaboratorDialog(): void {
    this.selectedCollaborator.set(null);
    this.dialog()?.close();
  }

  /**
   * Deletes the selected collaborator and reloads the list.
   * On failure the dialog stays open, so the user can retry or cancel.
   */
  deleteCollaborator(): void {
    const collaborator = this.selectedCollaborator();
    if (!collaborator) return;

    this.isLoading.set(true);
    this._collaboratorsService.deleteCollaborator(collaborator.sub).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe(() => {
      this.closeDeleteCollaboratorDialog();
      this.loadCollaborators();
    });
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.collaboratorsFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.collaboratorsFilterForm.reset(DEFAULT_COLLABORATOR_FILTERS);
    this.appliedFilters.set(DEFAULT_COLLABORATOR_FILTERS);
  }

  /**
   * Navigate to the collaborator creation page.
   */
  goToCreateCollaborator(): void {
    this._router.navigate(['create'], { relativeTo: this._activatedRoute });
  }

  /**
   * Go to the edit collaborator page.
   * @param collaboratorId the collaborator identifier.
   */
  goToEditCollaborator(collaboratorId: string): void {
    this._router.navigate(['edit', collaboratorId], { relativeTo: this._activatedRoute });
  }

  /**
   * Get the status string based on the collaborator's enabled state.
   * @param isEnabled Boolean indicating if the collaborator is enabled.
   * @returns 'Attivo' if enabled, 'Non attivo' otherwise.
   */
  getStatus(isEnabled: boolean): string {
    return isEnabled ? 'Attivo' : 'Non attivo';
  }

  /**
   * Get the full name of a collaborator.
   * @param collaborator The collaborator object.
   * @returns The full name of the collaborator.
   */
  getFullName(collaborator: CognitoCollaboratorResponseDto): string {
    const firstName = collaborator.name || '';
    const lastName = collaborator.surname || '';
    return `${firstName} ${lastName}`.trim();
  }

  /**
   * Gets the avatar URL for a collaborator from the cached presigned URLs.
   * @param s3Key the S3 key.
   * @returns the presigned URL or null if not available.
   */
  getAvatarUrl(s3Key: string | undefined): string | null {
    if (!s3Key) return null;
    return this.avatarUrls()[s3Key] ?? null;
  }

  /**
   * Gets the initials from the collaborator name.
   * @param collaborator the collaborator.
   * @returns the initials (first letter of name and family name).
   */
  getInitials(collaborator: CognitoCollaboratorResponseDto): string {
    const firstInitial = collaborator.name?.charAt(0) || '';
    const lastInitial = collaborator.surname?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
  }
}
