import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan, lucideSend } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { finalize, Observable, of, switchMap } from 'rxjs';
import { PageHeaderComponent } from '../../../..';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CoreResponsePendingOperationDto, CoreResponseTenantDto, CoreUpdateTenantDto } from '../../../../../../../libs/api/src';
import { ON_PRODUCT_STATUSES } from '../../../../constants/provisioning-statuses';
import { SyncStateDirective } from '../../../../directives/sync-state.directive';
import { SyncState } from '../../../../enums/sync-state.enum';
import { TenantStatus } from '../../../../enums/tenant-status.enum';
import { SyncStatePipe } from '../../../../pipes/sync-state/sync-state.pipe';
import { TenantStatusPipe } from '../../../../pipes/tenant-status/tenant-status.pipe';
import { TenantStatusDirective } from '../../directives/tenant-status.directive';
import { TenantsApiService } from '../../../../services/api-services/tenants/tenants-api.service';
import { OrdersApiService } from '../../../../services/api-services/orders/orders-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { Capability } from '../../../../enums/capability.enum';
import { CreateEditTenantForm } from '../../interfaces/create-edit-tenant-form';
import { TenantFormComponent } from '../../components/tenant-form/tenant-form.component';
import { StructureDynamicFormService } from '../../services/structure-dynamic-form/structure-dynamic-form.service';

@Component({
  selector: 'rocket-tenants-edit',
  imports: [
    ...BrnDialogImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmTooltipImports,
    NgIcon,
    PageHeaderComponent,
    TenantFormComponent,
    TenantStatusDirective,
    TenantStatusPipe,
    SyncStateDirective,
    SyncStatePipe
  ],
  providers: [provideIcons({ lucideBan, lucideSend })],
  templateUrl: './tenants-edit.component.html',
  styleUrl: './tenants-edit.component.css'
})
export class TenantsEditComponent {
  /** Activated route instance */
  private readonly _activatedRoute = inject(ActivatedRoute)

  /** Router service. */
  private readonly _router = inject(Router);

  /** Tenants api service instance. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** Orders api service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);


  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Product ID from route parameters. */
  productId = this._activatedRoute.snapshot.params['productId'];

  /** View child reference to the product form component. */
  form = viewChild<TenantFormComponent>('form');

  /** Tenant ID from route parameters. */
  tenantId = this._activatedRoute.snapshot.params['tenantId'];

  /** The tenant being edited. */
  readonly tenantData = signal<CoreResponseTenantDto | undefined>(undefined);

  /** Operations sent to the product for the tenant. */
  readonly operations = signal<CoreResponsePendingOperationDto[]>([]);

  /** Whether a request on the tenant is running. */
  readonly isLoading = signal(false);

  /** Dialog to confirm the discard of the failed operation. */
  private readonly _discardDialog = viewChild<BrnDialog>('discardDialog');

  /** Whether the user can change the tenant and work on its requests; otherwise it only reads it. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageTenants));

  /** Whether the product has created the tenant: only then can it be changed. */
  readonly isOnProduct = computed(() => ON_PRODUCT_STATUSES.includes(this.tenantData()?.status ?? ''));

  /** Whether an operation on the tenant waits for the product or failed: no other one can start. */
  readonly hasOpenOperation = computed(() => [SyncState.Pending, SyncState.Failed].includes(this.tenantData()?.syncState as SyncState));

  /** Whether the open operation can be sent again: the creation, or an operation waiting or failed. */
  readonly canResend = computed(() => this.canManage() && !!this.tenantData()?.pendingOperationId
    && (this.tenantData()?.status === TenantStatus.Requested || this.hasOpenOperation()));

  /** Whether the open operation can be discarded: only after the product's error. */
  readonly canDiscard = computed(() => this.canManage() && this.tenantData()?.syncState === SyncState.Failed);

  /** Whether the failed operation is the creation, whose discard cancels the tenant. */
  readonly isFailedCreation = computed(() => this.canDiscard() && this.tenantData()?.status === TenantStatus.Requested);

  /** Subtitle with what the state means, or the product's error. */
  readonly statusNote = computed(() => {
    const tenant = this.tenantData();
    if (tenant?.syncState === SyncState.Failed) {
      return `Il prodotto ha risposto con un errore: ${tenant.failureReason ?? 'nessun motivo indicato'}.`;
    }
    if (tenant?.status === TenantStatus.Requested) return 'In attesa della risposta del prodotto.';
    if (tenant?.syncState === SyncState.Pending) return 'Un\'operazione è in attesa della risposta del prodotto.';
    if (tenant?.status === TenantStatus.Deleted) return 'Eliminato sul prodotto: resta qui finché non lo elimini definitivamente dalla lista.';
    return tenant?.confirmedAfterCancellation ? 'Il prodotto lo ha creato dopo l\'annullamento della richiesta.' : '';
  });

  /**
   * Constructor to load the tenant and its operations.
   */
  constructor() {
    this._tenantsApiService.getTenant(this.productId, this.tenantId).subscribe(tenant => this.tenantData.set(tenant));
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
   * Sends the open operation of the tenant to the product again.
   */
  resendRequest(): void {
    this.isLoading.set(true);
    this._tenantsApiService.resendTenantRequest(this.productId, this.tenantId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(tenant => {
        this.tenantData.set(tenant);
        this._loadOperations();
      });
  }

  /**
   * Discards the operation the product answered with an error; a discarded creation cancels the tenant and its users.
   */
  discardOperation(): void {
    this.isLoading.set(true);
    this._tenantsApiService.cancelTenantRequest(this.productId, this.tenantId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(tenant => {
        this.tenantData.set(tenant);
        this._loadOperations();
        this.closeDiscardDialog();
      });
  }

  /**
   * Updates an existing tenant. A new order line picked is provisioned on the tenant first, which reactivates it if
   * inactive; the other changes are then asked to the product.
   * @param tenantForm the form group containing the updated tenant data.
   */
  updateTenant(tenantForm: FormGroup<CreateEditTenantForm>): void {
    if (!tenantForm.dirty) return;

    // Build update DTO with only dirty fields.
    const updatedTenant: CoreUpdateTenantDto = {};

    if (tenantForm.get('name')?.dirty) updatedTenant.name = tenantForm.value.name!;
    if (tenantForm.get('description')?.dirty) updatedTenant.description = tenantForm.value.description!;
    if (tenantForm.get('status')?.dirty) updatedTenant.status = tenantForm.value.status! as CoreUpdateTenantDto['status'];

    // Dynamic data - include only dirty fields, parsed by structure type.
    const dataGroup = tenantForm.controls.data as FormGroup;
    if (dataGroup.dirty) {
      let rawData: { [key: string]: any } = {};
      Object.keys(dataGroup.controls).forEach(controlName => {
        if ((dataGroup.controls as any)[controlName].dirty) {
          rawData[controlName] = (dataGroup.controls as any)[controlName].value;
        }
      });
      const tenantStructure = this._productsCacheService.products().find(p => p.id === this.productId)?.tenantStructure || [];
      updatedTenant.data = StructureDynamicFormService.parseDataByStructure(rawData, tenantStructure);
    }

    // Ask the product for the change and navigate back: the tenant shows it once the product confirms.
    const orderId = tenantForm.value.orderId;
    const handover: Observable<unknown> = orderId ? this._ordersApiService.provisionLineOnTenant(orderId, this.productId, this.tenantId) : of(null);
    handover.pipe(
      switchMap((): Observable<unknown> => Object.keys(updatedTenant).length > 0 ? this._tenantsApiService.updateTenant(this.productId, this.tenantId, updatedTenant) : of(null)),
    ).subscribe(() => {
      this._router.navigate([this._activatedRoute.snapshot.data['back'] ?? '../../'], { relativeTo: this._activatedRoute });
    });
  }

  /**
   * Reads the operations sent to the product for the tenant.
   */
  private _loadOperations(): void {
    this._tenantsApiService.listTenantOperations(this.productId, this.tenantId).subscribe(operations => this.operations.set(operations));
  }
}
