import { Component, computed, effect, inject, signal, Signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFolderOpen, lucidePencil, lucidePlus, lucideTrash2, lucideInbox, lucideEye } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmError, HlmHint } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { CoreResponseProductDto } from '../../../../../../../libs/api/src';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { CognitoUtilsService } from '../../../../../auth';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { ProductStatusDirective } from '../../../../directives/product-status.directive';
import { ProductStatusPipe } from '../../../../pipes/product-status/product-status.pipe';
import { ProductsApiService } from '../../../../services/api-services/products/products-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { Capability } from '../../../../enums/capability.enum';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'rocket-products',
  imports: [
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmTableImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmInputImports,
    ...HlmAvatarImports,
    ...HlmTooltipImports,
    HlmHint,
    HlmError,
    ReactiveFormsModule,
    PageHeaderComponent,
    TablePaginationComponent,
    NgIcon,
    ProductStatusPipe,
    ProductStatusDirective,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideEye, lucideInbox,
      lucidePlus,
      lucidePencil,
      lucideFolderOpen,
      lucideTrash2
    })
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {
  /** Router service instance. */
  private readonly _router = inject(Router);

  /** Pages of the products. */
  readonly pager = inject<CursorPaginationService<CoreResponseProductDto>>(CursorPaginationService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Products api service instance. */
  private readonly _productsService = inject(ProductsApiService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Cognito utils service instance. */
  private readonly _cognitoUtils = inject(CognitoUtilsService);

  /** The permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Whether the systems integrated with the product are named in the deletion dialog. */
  readonly integrationsEnabled = INTEGRATIONS_ENABLED;

  /** Presigned download URLs for product logos, keyed by S3 key. */
  logoUrls = signal<Record<string, string>>({});

  /** User groups signal. */
  userGroups = toSignal(
    this._cognitoUtils.getUserIdentifiers().pipe(
      map((userIdentifiers) => userIdentifiers.groups || []),
      catchError((error) => {
        console.error('Error checking user roles:', error);
        void this._router.navigate(['/login']);
        return of([] as string[]); // Explicit type
      })
    ),
    { initialValue: [] as string[] }
  );

  /** Whether the user can create, edit and delete products. */
  canManage = computed(() => this._permissions.can(Capability.ManageProducts));

  /** Form group for deleting a product. */
  deleteForm = new FormGroup({
    name: new FormControl<string>('', [Validators.required])
  });

  /** Error message signal for delete product form. */
  errorMessage = signal<string | null>(null);

  /** Delete confirmation dialog reference. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Selected product for deletion. */
  selectedProduct: CoreResponseProductDto | null = null;

  /** Loading state signal. */
  isLoading = signal<boolean>(false);

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page of the products.
    this.pager.load(page => this._productsService.listProducts(page));

    // Load presigned URLs for product logos.
    effect(() => {
      const s3Keys = this.pager.items()
        .map(p => p.logoS3Key)
        .filter((key): key is string => !!key);

      if (s3Keys.length === 0) return;

      const requests: Record<string, ReturnType<S3UploadService['getDownloadUrl']>> = {};
      for (const key of s3Keys) {
        requests[key] = this._s3UploadService.getDownloadUrl('PRODUCT_LOGO', key);
      }

      forkJoin(requests).subscribe(urls => {
        this.logoUrls.set(urls);
      });
    });

  }

  /**
   * Reads the current page again and refreshes the product cache of the application.
   */
  loadProducts(): void {
    this._productsCacheService.refreshProducts();
    this.pager.reload();
  }

  /**
   * Navigate to the product creation page.
   */
  goToCreateProduct(): void {
    this._router.navigate(['/products/create']);
  }

  /**
   * Navigate to the product edit page.
   * @param productId the identifier of the product.
   */
  goToProductEdit(productId: string): void {
    this._router.navigate([`/products/edit/${productId}`]);
  }

  /**
   * Navigate to the workspace of a specific product.
   * @param productId the identifier of the product.
   */
  goToProductWorkspace(productId: string): void {
    this._router.navigate([`/products/workspaces/${productId}`]);
  }

  /**
   * Open delete product confirmation dialog.
   * @param productId the identifier of the product.
   */
  openDeleteProductDialog(productId: string): void {
    this.selectedProduct = this.pager.items().find(product => product.id === productId) || null;
    this.dialog()?.open();
  }

  /**
   * Deletes the selected product.
   */
  deleteProduct(): void {
    const input = this.deleteForm.value;
    if (!this.selectedProduct) return;

    if (input.name === this.selectedProduct.name) {
      this.isLoading.set(true);
      this._productsService.deleteProduct(this.selectedProduct.id).pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.closeDeleteProductDialog();
          this.loadProducts();
        })
      ).subscribe();
    } else {
      this.deleteForm.reset();
      this.errorMessage.set('Il nome del prodotto non corrisponde.');
    }
  }

  /**
   * Closes the delete product dialog.
   */
  closeDeleteProductDialog(): void {
    this.selectedProduct = null;
    this.deleteForm.reset();
    this.errorMessage.set(null);
    this.dialog()?.close();
  }

  /**
   * Gets the logo URL for a product from the cached presigned URLs.
   * @param s3Key the S3 key.
   * @returns the presigned URL or null if not available.
   */
  getLogoUrl(s3Key: string | undefined): string | null {
    if (!s3Key) return null;
    return this.logoUrls()[s3Key] ?? null;
  }

  /**
   * Gets the initials from the product prefix (first 2 characters uppercase).
   * @param prefix the product prefix.
   * @returns the initials.
   */
  getInitials(prefix: string): string {
    return prefix.substring(0, 2).toUpperCase();
  }
}
