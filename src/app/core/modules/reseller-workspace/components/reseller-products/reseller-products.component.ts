import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFolderOpen, lucidePackage } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, forkJoin, of } from 'rxjs';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { Capability } from '../../../../enums/capability.enum';

/**
 * Table of the products a reseller is enabled to sell, read-only: they come from its contract in force. Each opens its product
 * workspace, where the reseller works within its own perimeter.
 * Usage: <rocket-reseller-products [productIds]="reseller.productIds" />
 */
@Component({
  selector: 'rocket-reseller-products',
  imports: [
    ...HlmAvatarImports,
    ...HlmButtonImports,
    ...HlmEmptyImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideFolderOpen,
      lucidePackage,
    })
  ],
  templateUrl: './reseller-products.component.html',
})
export class ResellerProductsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Identifiers of the products the reseller is enabled to sell. */
  productIds = input<string[] | null | undefined>([]);

  /** Presigned download URLs of the product logos, keyed by S3 key. */
  logoUrls = signal<Record<string, string>>({});

  /** Whether the user can enter the workspace of a product. */
  readonly canOpenWorkspace = computed(() => this._permissions.can(Capability.OpenProductWorkspaces));

  /** Enabled products, in the order of the catalog. */
  readonly products = computed(() => {
    const enabled = this.productIds() ?? [];
    return this._productsCacheService.products().filter(product => enabled.includes(product.id));
  });

  /**
   * Constructor of the component.
   */
  constructor() {
    // Load the presigned URLs of the logos of the enabled products.
    effect(() => {
      const s3Keys = this.products()
        .map(product => product.logoS3Key)
        .filter((key): key is string => !!key);
      if (s3Keys.length === 0) return;

      const requests: Record<string, ReturnType<S3UploadService['getDownloadUrl']>> = {};
      for (const key of s3Keys) {
        requests[key] = this._s3UploadService.getDownloadUrl('PRODUCT_LOGO', key).pipe(catchError(() => of('')));
      }
      forkJoin(requests).subscribe(urls => this.logoUrls.set(urls));
    });
  }

  /**
   * Opens the workspace of a product.
   * @param productId the identifier of the product.
   */
  goToProductWorkspace(productId: string): void {
    void this._router.navigate(['/products', 'workspaces', productId]);
  }

  /**
   * Gets the logo URL of a product from the loaded presigned URLs.
   * @param s3Key the S3 key of the logo.
   * @returns the presigned URL, or null when not available.
   */
  getLogoUrl(s3Key: string | undefined): string | null {
    if (!s3Key) return null;
    return this.logoUrls()[s3Key] || null;
  }

  /**
   * Gets the initials of a product, shown when it has no logo.
   * @param prefix the prefix of the product.
   * @returns the first two characters, uppercase.
   */
  getInitials(prefix: string): string {
    return prefix.substring(0, 2).toUpperCase();
  }
}
