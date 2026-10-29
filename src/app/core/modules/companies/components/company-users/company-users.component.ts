import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideInbox, lucidePencil, lucideSearch } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, map, of, switchMap } from 'rxjs';
import { CoreResponseUserDto } from '../../../../../../../libs/api/src';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { Capability } from '../../../../enums/capability.enum';
import { UserStatus } from '../../../../enums/user-status.enum';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { UserStatusPipe } from '../../../../pipes/user-status/user-status.pipe';
import { UsersApiService } from '../../../../services/api-services/users/users-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { sameFilters } from '../../../../utils/filters.util';
import { UserStatusDirective } from '../../../workspaces/directives/user-status.directive';
import { FilterCompanyUsersForm } from '../../interfaces/filter-company-users-form.interface';

/** Values of the user filters. */
type UserFilterValues = ReturnType<FormGroup<FilterCompanyUsersForm>['getRawValue']>;

/** Filters the table opens with, and that the reset brings back. */
const DEFAULT_USER_FILTERS: UserFilterValues = { search: null, productId: null, status: null };

/**
 * Users of a company on every product: those of its tenants (UR-RK-291).
 * A company has few users, all read at once, so the filters work on the page. A user is added from its tenant,
 * which fixes product and tenant.
 * Usage: <rocket-company-users [companyId]="company.id" />
 */
@Component({
  selector: 'rocket-company-users',
  imports: [
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmComboboxImports,
    ...BrnComboboxImports,
    ...HlmEmptyImports,
    ...HlmInputImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    MultiSelectFilterComponent,
    UserStatusDirective,
    UserStatusPipe,
    NgIcon,
    ReactiveFormsModule,
  ],
  providers: [
    provideIcons({ lucideEye, lucideInbox, lucidePencil, lucideSearch })
  ],
  templateUrl: './company-users.component.html',
})
export class CompanyUsersComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance: the detail of the company. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Users API service instance. */
  private readonly _usersApiService = inject(UsersApiService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Toaster service instance, to say when the read fails. */
  private readonly _toasterService = inject(ToasterService);

  /** Identifier of the company the users belong to. */
  companyId = input.required<string>();

  /** User statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(UserStatus)
    .filter(status => status !== UserStatus.Deleted)
    .map(status => ({ value: status, label: new UserStatusPipe().transform(status) }));

  /** Filter of the product combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Products a user can belong to. */
  readonly products = this._productsCacheService.products;

  /** Converts a product identifier to its name, for the product combobox. */
  readonly productLabel = (productId: string): string => this._productNames().get(productId) ?? '';

  /** Form group for filtering the users. */
  usersFilterForm = new FormGroup<FilterCompanyUsersForm>({
    search: new FormControl<string | null>(DEFAULT_USER_FILTERS.search),
    productId: new FormControl<string | null>(DEFAULT_USER_FILTERS.productId),
    status: new FormControl<string[] | null>(DEFAULT_USER_FILTERS.status),
  });

  /** Filters applied to the table. */
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

  /** Users of the company, by surname and name; a new company replaces a read still running. */
  private readonly _users = toSignal(
    toObservable(this.companyId).pipe(
      switchMap(companyId => this._usersApiService.getUsersByCompany(companyId).pipe(catchError(() => {
        this._toasterService.showError('Impossibile leggere gli utenti dell\'azienda.');
        return of([]);
      }))),
    ),
    { initialValue: [] as CoreResponseUserDto[] },
  );

  /** Users that match the applied filters. */
  readonly users = computed(() => {
    const { search, productId, status } = this.appliedFilters();
    const text = search?.trim().toLowerCase();
    return this._users().filter(user =>
      (!text || [user.name, user.surname, user.email].some(value => value?.toLowerCase().startsWith(text)))
      && (!productId || user.productId === productId)
      && (status === null || status.includes(user.status))
    );
  });

  /** Whether the user can change the users; otherwise it only reads them. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageUsers));

  /** Product names by identifier. */
  private readonly _productNames = computed(() => new Map(this.products().map(product => [product.id, product.name])));

  /**
   * Applies the filters of the form.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.usersFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults.
   */
  resetFilters(): void {
    this.usersFilterForm.reset(DEFAULT_USER_FILTERS);
    this.appliedFilters.set(DEFAULT_USER_FILTERS);
  }

  /**
   * Returns the name of the product of a user.
   * @param user the user.
   * @returns the product name, or its identifier when the product is unknown.
   */
  productOf(user: CoreResponseUserDto): string {
    return this._productNames().get(user.productId) ?? user.productId;
  }

  /**
   * Opens the detail of a user within the company.
   * @param user the user to open.
   */
  goToUser(user: CoreResponseUserDto): void {
    this._router.navigate(['users', user.productId, user.id], { relativeTo: this._activatedRoute });
  }
}
