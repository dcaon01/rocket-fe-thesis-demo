import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideEye, lucidePencil, lucidePlus, lucideRefreshCw, lucideTrash2, lucideInbox, lucideSearch } from '@ng-icons/lucide';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmError, HlmHint } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { BrnDialog } from '@spartan-ng/brain/dialog';
import { finalize, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { CoreResponseUserDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { Capability } from '../../../../enums/capability.enum';
import { ResellerOwnerPipe } from '../../../../pipes/reseller-owner/reseller-owner.pipe';
import { UserStatusPipe } from '../../../../pipes/user-status/user-status.pipe';
import { UserStatus } from '../../../../enums/user-status.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { UsersApiService, UsersFilters } from '../../../../services/api-services/users/users-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { UserStatusDirective } from '../../directives/user-status.directive';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterUsersForm } from '../../interfaces/filter-users-form.interface';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { ON_PRODUCT_STATUSES, PURGEABLE_STATUSES } from '../../../../constants/provisioning-statuses';
import { SyncStateDirective } from '../../../../directives/sync-state.directive';
import { SyncState } from '../../../../enums/sync-state.enum';
import { SyncStatePipe } from '../../../../pipes/sync-state/sync-state.pipe';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/** Values of the user filters. */
type UserFilterValues = ReturnType<FormGroup<FilterUsersForm>['getRawValue']>;

/** Filters the list opens with, and that the reset brings back. */
const DEFAULT_USER_FILTERS: UserFilterValues = { search: null, tenantName: null, status: [UserStatus.Active, UserStatus.Inactive, UserStatus.Requested] };

@Component({
  selector: 'rocket-users',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmTableImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    HlmError,
    HlmHint,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    NgIcon,
    ReactiveFormsModule,
    UserStatusDirective,
    SyncStateDirective,
    SyncStatePipe,
    ...HlmTooltipImports,
    ResellerOwnerPipe,
    UserStatusPipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideSearch, lucideInbox,
      lucidePlus,
      lucidePencil,
      lucideEye,
      lucideRefreshCw,
      lucideTrash2
    })
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  /** Router service instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Users API service instance. */
  private readonly _usersApiService = inject(UsersApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Pages of the users. */
  readonly pager = inject<CursorPaginationService<CoreResponseUserDto>>(CursorPaginationService);

  /** Whether the user sees which reseller manages each record. */
  readonly canViewOwnership = computed(() => this._permissions.can(Capability.ViewResellerOwnership));

  /** Whether the user can create and change users; otherwise it only reads them. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageUsers));

  /** Whether the user can delete users. */
  readonly canDelete = computed(() => this._permissions.can(Capability.DeleteUsers));

  /** Dialog reference. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Dialog content reference. */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /** User statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(UserStatus).map(status => ({ value: status, label: new UserStatusPipe().transform(status) }));

  /** Statuses of the users that can be removed for good: deleted on the product, or a discarded request. */
  readonly purgeableStatuses = PURGEABLE_STATUSES;

  /** Whether the open dialog removes the user for good instead of asking the product to delete it. */
  readonly isPurge = signal(false);

  /** Form group for filtering users. */
  usersFilterForm = new FormGroup<FilterUsersForm>({
    search: new FormControl<string | null>(DEFAULT_USER_FILTERS.search),
    tenantName: new FormControl<string | null>(DEFAULT_USER_FILTERS.tenantName),
    status: new FormControl<string[] | null>(DEFAULT_USER_FILTERS.status)
  });

  /** Filters applied to the list. */
  appliedFilters = signal<UserFilterValues>(DEFAULT_USER_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.usersFilterForm.valueChanges.pipe(map(() => this.usersFilterForm.getRawValue())),
    { initialValue: this.usersFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_USER_FILTERS));

  /** Selected user for deletion. */
  selectedUser: CoreResponseUserDto | null = null;

  /** Form group for deleting a user. */
  deleteForm = new FormGroup({
    email: new FormControl<string>('', [Validators.required])
  });

  /** Error message signal for delete user form. */
  errorMessage = signal<string | null>(null);

  /** Loading signal. */
  isLoading = signal<boolean>(false);

  /** Refresh cooldown signal (seconds remaining). */
  refreshCooldown = signal<number>(0);

  /**
   * Constructor of the UsersComponent.
   */
  constructor() {
    // Read the first page whenever the applied filters change.
    effect(() => {
      const filters = this.appliedFilters();
      const productId = this._activatedRoute.snapshot.params['productId'];

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._usersApiService.listUsers(page, { productId, ...this._toQuery(filters) })));
    });

    // Manage dialog state changes.
    effect(() => {
      const state = this.dialogContent()?.state();
      if (state === 'closed') {
        this.closeDeleteUserDialog();
      }
    });
  }

  /**
   * Reads the current page again.
   */
  loadUsers(): void {
    this.pager.reload();
  }

  /**
   * Refreshes users with a 5 second cooldown.
   */
  refreshUsers(): void {
    this.refreshCooldown.set(5);
    this.loadUsers();
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
    this.appliedFilters.set(this.usersFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.usersFilterForm.reset(DEFAULT_USER_FILTERS);
    this.appliedFilters.set(DEFAULT_USER_FILTERS);
  }

  /**
   * Navigates to the create user page.
   */
  goToCreateUser() {
    this._router.navigate(['create'], { relativeTo: this._activatedRoute });
  }

  /**
   * Navigates to the edit user page.
   * @param tenantId the tenant identifier.
   */
  goToEditUser(userId: string): void {
    this._router.navigate(['edit', `${userId}`], { relativeTo: this._activatedRoute });
  }

  /**
   * Opens the delete user confirmation dialog.
   * @param userId the identifier of the user.
   */
  openDeleteUserDialog(userId: string): void {
    this.selectedUser = this.pager.items().find(u => u.id === userId) || null;
    this.isPurge.set(PURGEABLE_STATUSES.includes(this.selectedUser?.status ?? ''));
    this.dialog()?.open();
  }

  /**
   * Closes the delete user confirmation dialog.
   */
  closeDeleteUserDialog(): void {
    this.selectedUser = null;
    this.deleteForm.reset();
    this.errorMessage.set(null);
    this.dialog()?.close();
  }

  /**
   * Deletes a user.
   */
  deleteUser(): void {
    const productId = this._activatedRoute.snapshot.params['productId'];
    const input = this.deleteForm.value;
    if (!this.selectedUser) return;

    if (input.email === this.selectedUser.email) {
      this.isLoading.set(true);
      const request$ = this.isPurge()
        ? this._usersApiService.purgeUser(productId, this.selectedUser.id)
        : this._usersApiService.deleteUser(productId, this.selectedUser.id).pipe(map(() => undefined));
      request$.pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.closeDeleteUserDialog();
          this.loadUsers();
        })
      ).subscribe();
    } else {
      this.deleteForm.reset();
      this.errorMessage.set("L'email dell'utente non corrisponde.");
    }
  }

  /**
   * Tells whether an operation on the user waits for the product or failed.
   * @param user the user of the row.
   * @returns whether an operation is open.
   */
  hasOpenOperation(user: CoreResponseUserDto): boolean {
    return [SyncState.Pending, SyncState.Failed].includes(user.syncState as SyncState);
  }

  /**
   * Tells whether the product can be asked to delete the user: it has it, and no other operation is open.
   * @param user the user of the row.
   * @returns whether the deletion can be asked.
   */
  isDeletable(user: CoreResponseUserDto): boolean {
    return ON_PRODUCT_STATUSES.includes(user.status) && !this.hasOpenOperation(user);
  }

  /**
   * Turns the filter values into the query of the listing.
   * @param filters the filter values.
   * @returns the query.
   */
  private _toQuery(filters: UserFilterValues): Omit<UsersFilters, 'productId'> {
    return {
      search: orUndefined(filters.search),
      tenantName: orUndefined(filters.tenantName),
      status: orUndefined(filters.status) as UsersFilters['status'],
    };
  }
}
