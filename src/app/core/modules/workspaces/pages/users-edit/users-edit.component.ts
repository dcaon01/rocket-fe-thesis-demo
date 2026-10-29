import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan, lucideSend } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { finalize } from 'rxjs';
import { CognitoUserAttributeDto, CoreResponsePendingOperationDto, CoreResponseTenantDto, CoreResponseUserDto, CoreUpdateUserDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { ON_PRODUCT_STATUSES } from '../../../../constants/provisioning-statuses';
import { SyncStateDirective } from '../../../../directives/sync-state.directive';
import { SyncState } from '../../../../enums/sync-state.enum';
import { UserStatus } from '../../../../enums/user-status.enum';
import { SyncStatePipe } from '../../../../pipes/sync-state/sync-state.pipe';
import { UserStatusPipe } from '../../../../pipes/user-status/user-status.pipe';
import { UserStatusDirective } from '../../directives/user-status.directive';
import { ProductsApiService } from '../../../../services/api-services/products/products-api.service';
import { CreateEditUserForm } from '../../interfaces/create-edit-users-form';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { UsersApiService } from '../../../../services/api-services/users/users-api.service';
import { TenantsApiService } from '../../../../services/api-services/tenants/tenants-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { Capability } from '../../../../enums/capability.enum';
import { StructureDynamicFormService } from '../../services/structure-dynamic-form/structure-dynamic-form.service';

@Component({
  selector: 'rocket-users-edit',
  imports: [
    ...BrnDialogImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmTooltipImports,
    NgIcon,
    PageHeaderComponent,
    UserFormComponent,
    UserStatusDirective,
    UserStatusPipe,
    SyncStateDirective,
    SyncStatePipe
  ],
  providers: [provideIcons({ lucideBan, lucideSend })],
  templateUrl: './users-edit.component.html',
  styleUrl: './users-edit.component.css'
})
export class UsersEditComponent {
  /** Activated route instance */
  private readonly _activatedRoute = inject(ActivatedRoute)

  /** Router service. */
  private readonly _router = inject(Router);

  /** Products API service. */
  private readonly _productsApiService = inject(ProductsApiService);

  /** Users API service. */
  private readonly _usersApiService = inject(UsersApiService);

  /** Tenants API service. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Product ID from route parameters. */
  productId = this._activatedRoute.snapshot.params['productId'];

  /** User ID from route parameters. */
  userId = this._activatedRoute.snapshot.params['userId'];

  /** Product signal. */
  product = toSignal(this._productsApiService.getProduct(this.productId));

  /** The user being edited. */
  readonly userData = signal<CoreResponseUserDto | undefined>(undefined);

  /** The tenant of the user, read only while the user is requested. */
  readonly tenantData = signal<CoreResponseTenantDto | undefined>(undefined);

  /** Operations sent to the product for the user. */
  readonly operations = signal<CoreResponsePendingOperationDto[]>([]);

  /** Whether a request on the user is running. */
  readonly isLoading = signal(false);

  /** Dialog to confirm the discard of the failed operation. */
  private readonly _discardDialog = viewChild<BrnDialog>('discardDialog');

  /** Whether the user can change the record; otherwise it only reads it. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageUsers));

  /** Whether the user can send again or discard the request of the record. */
  readonly canRetry = computed(() => this._permissions.can(Capability.RetryUserRequests));

  /** Whether the product has created the user: only then can it be changed. */
  readonly isOnProduct = computed(() => ON_PRODUCT_STATUSES.includes(this.userData()?.status ?? ''));

  /** Whether the user is asked to the product and not created yet. */
  readonly isRequested = computed(() => this.userData()?.status === UserStatus.Requested);

  /** Whether an operation on the user waits for the product or failed: no other one can start. */
  readonly hasOpenOperation = computed(() => [SyncState.Pending, SyncState.Failed].includes(this.userData()?.syncState as SyncState));

  /** Whether the open operation can be sent again: the creation, or an operation waiting or failed. */
  readonly canResend = computed(() => this.canRetry() && !!this.userData()?.pendingOperationId && (this.isRequested() || this.hasOpenOperation()));

  /** Whether the open operation can be discarded: only after the product's error. */
  readonly canDiscard = computed(() => this.canRetry() && this.userData()?.syncState === SyncState.Failed);

  /** Whether the product has confirmed the tenant: a user asked with its tenant is sent only after it. */
  readonly isTenantConfirmed = computed(() => ON_PRODUCT_STATUSES.includes(this.tenantData()?.status ?? ''));

  /** Whether the user waits for its tenant: its creation cannot be sent before the tenant is confirmed. */
  readonly waitsForTenant = computed(() => this.isRequested() && !this.isTenantConfirmed());

  /** Subtitle with what the state means, or the product's error. */
  readonly statusNote = computed(() => {
    const user = this.userData();
    if (user?.syncState === SyncState.Failed) {
      return `Il prodotto ha risposto con un errore: ${user.failureReason ?? 'nessun motivo indicato'}.`;
    }
    if (this.isRequested()) {
      return this.tenantData() && !this.isTenantConfirmed()
        ? 'In attesa che il prodotto confermi il tenant.'
        : 'In attesa della risposta del prodotto.';
    }
    if (user?.syncState === SyncState.Pending) return 'Un\'operazione è in attesa della risposta del prodotto.';
    if (user?.status === UserStatus.Deleted) return 'Eliminato sul prodotto: resta qui finché non lo elimini definitivamente dalla lista.';
    return user?.confirmedAfterCancellation ? 'Il prodotto lo ha creato dopo l\'annullamento della richiesta.' : '';
  });

  /**
   * Constructor to load the user with its operations, and its tenant while the user is requested.
   */
  constructor() {
    this._usersApiService.getUser(this.productId, this.userId).subscribe(user => {
      this.userData.set(user);
      if (user.status === UserStatus.Requested) {
        this._tenantsApiService.getTenant(this.productId, user.tenant).subscribe(tenant => this.tenantData.set(tenant));
      }
    });
    this._loadOperations();
  }

  /**
   * Opens the dialog to confirm the discard of the failed operation.
   */
  openDiscardDialog(): void {
    this._discardDialog()?.open();
  }

  /**
   * Closes the dialog to confirm the discard of the failed operation.
   */
  closeDiscardDialog(): void {
    this._discardDialog()?.close();
  }

  /**
   * Sends the open operation of the user to the product again.
   */
  resendRequest(): void {
    this.isLoading.set(true);
    this._usersApiService.resendUserRequest(this.productId, this.userId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(user => {
        this.userData.set(user);
        this._loadOperations();
      });
  }

  /**
   * Discards the operation the product answered with an error; a discarded creation cancels the user.
   */
  discardOperation(): void {
    this.isLoading.set(true);
    this._usersApiService.cancelUserRequest(this.productId, this.userId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(user => {
        this.userData.set(user);
        this._loadOperations();
        this.closeDiscardDialog();
      });
  }

  /**
   * Updates an existing user.
   * @param userForm the form group containing the updated user data.
   */
  updateUser(userForm: FormGroup<CreateEditUserForm>): void {
    if (!userForm.dirty) return;

    // Build update DTO with only dirty fields.
    const updateUser: CoreUpdateUserDto = {};

    if (userForm.get('name')?.dirty) updateUser.name = userForm.value.name!;
    if (userForm.get('surname')?.dirty) updateUser.surname = userForm.value.surname!;
    if (userForm.get('roles')?.dirty) updateUser.roles = userForm.value.roles || [];
    if (userForm.get('status')?.dirty) updateUser.status = userForm.value.status as CoreUpdateUserDto['status'];
    if (userForm.get('referent')?.dirty) updateUser.referent = userForm.value.referent;

    // Dynamic data - include if dirty, parsed by structure type.
    const dataGroup = userForm.controls.data as FormGroup;
    if (dataGroup.dirty) {
      let rawData: { [key: string]: any } = {};
      Object.keys(dataGroup.controls).forEach(controlName => {
        rawData[controlName] = (dataGroup.controls as any)[controlName].value;
      });
      const userStructure = this.product()?.userStructure || [];
      updateUser.data = StructureDynamicFormService.parseDataByStructure(rawData, userStructure);
    }

    // Custom attributes - include if dirty.
    const customAttributesGroup = userForm.controls.customAttributes as FormGroup;
    if (customAttributesGroup.dirty) {
      let customAttributes: CognitoUserAttributeDto[] = [];
      Object.keys(customAttributesGroup.controls).forEach(attrName => {
        const value = (customAttributesGroup.controls as any)[attrName].value;
        customAttributes.push({ name: attrName, value: value });
      });
      updateUser.customAttributes = customAttributes;
    }

    // Ask the product for the change and navigate back: the user shows it once the product confirms.
    this._usersApiService.updateUser(this.productId, this.userId, updateUser).subscribe(() => {
      this._router.navigate([this._activatedRoute.snapshot.data['back'] ?? '../../'], { relativeTo: this._activatedRoute });
    });
  }

  /**
   * Reads the operations sent to the product for the user.
   */
  private _loadOperations(): void {
    this._usersApiService.listUserOperations(this.productId, this.userId).subscribe(operations => this.operations.set(operations));
  }
}
