import { Component, computed, effect, inject, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { AppContextService } from '../../services/app-context/app-context.service';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBreadCrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { catchError, filter, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { CoreResponseProductDto } from '../../../../../libs/api/src';
import { Breadcrumb } from '../../interfaces/breadcrumb.interface';
import { ResellersApiService } from '../../services/api-services/resellers/resellers-api.service';
import { S3UploadService } from '../../services/api-services/s3/s3-upload.service';
import { BreadcrumbsService } from '../../services/breadcrumbs/breadcrumbs.service';
import { ProductsCacheService } from '../../services/cache/products-cache.service';
import { PermissionsService } from '../../services/permissions/permissions.service';
import { UserContextService } from '../../services/user-context/user-context.service';
import { Capability } from '../../enums/capability.enum';

@Component({
  selector: 'rocket-topbar',
  imports: [
    ...HlmBreadCrumbImports,
    ...BrnComboboxImports,
    ...HlmComboboxImports,
    ...HlmInputGroupImports,
    ...HlmAvatarImports,
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** The application context service instance: which area, which workspace. */
  private readonly _context = inject(AppContextService);

  /** The breadcrumbs service instance. */
  private readonly _breadcrumbsService = inject(BreadcrumbsService);

  /** The products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** The S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** The permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** The resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** The user context service instance. */
  private readonly _userContext = inject(UserContextService);

  /** Whether the user can enter the workspace of a product, and so switch between them. */
  readonly canOpenWorkspaces = computed(() => this._permissions.can(Capability.OpenProductWorkspaces));

  /** Identifier of the reseller whose workspace a Keus user has open, null elsewhere and for the reseller users. */
  private readonly _keusResellerId = computed(() => this._userContext.isReseller() ? null : this._context.resellerId());

  /** Name of the reseller read for that workspace, with its identifier, so the one of another reseller never shows. */
  private readonly _resellerName = toSignal(
    toObservable(this._keusResellerId).pipe(
      switchMap(resellerId => resellerId
        ? this._resellersApiService.getReseller(resellerId).pipe(
          map(reseller => ({ resellerId, name: reseller.companyName })),
          catchError(() => of(null)),
        )
        : of(null))
    ),
    { initialValue: null }
  );

  /**
   * The breadcrumbs, with the name of the workspace in place of the workspace itself: «Prodotti > name > page» in the
   * one of a product, «Rivenditori > name > page» in the one of a reseller for a Keus user, the first leading to the
   * list and the name to the dashboard of the workspace. The reseller workspace is not nested under the list, so its
   * first breadcrumb is added here. Until the name is known, the label of the workspace stands in its place.
   */
  readonly breadcrumbs = computed<Breadcrumb[]>(() => {
    const breadcrumbs = this._breadcrumbsService.breadcrumbs();
    const basePath = this._context.basePath();
    const isProduct = !!this._context.productId();
    const keusResellerId = this._keusResellerId();
    const workspaceIndex = breadcrumbs.findIndex(breadcrumb => breadcrumb.url === basePath);
    if (!basePath || workspaceIndex < 0 || (!isProduct && !keusResellerId)) return breadcrumbs;

    const resellerName = this._resellerName();
    const name = isProduct
      ? this._context.currentProduct()?.name
      : resellerName?.resellerId === keusResellerId ? resellerName.name : undefined;
    const before = isProduct ? breadcrumbs.slice(0, workspaceIndex) : [{ label: 'Rivenditori', url: '/resellers' }];
    const pages = breadcrumbs.slice(workspaceIndex + 1);
    const current: Breadcrumb = { label: name ?? breadcrumbs[workspaceIndex].label, ...(pages.length > 0 && { url: basePath }) };
    return [...before, current, ...pages];
  });

  /** The products signal. */
  products: Signal<CoreResponseProductDto[]> = this._productsCacheService.products;

  /** The current product signal. */
  currentProduct = signal<CoreResponseProductDto | undefined>(undefined);

  /** Presigned download URLs for product logos, keyed by S3 key. */
  logoUrls = signal<Record<string, string>>({});

  /** Filter of the product combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Converts a product identifier to its name, used by the combobox for filtering and display. */
  readonly productLabel = (productId: string): string =>
    this.products().find(product => product.id === productId)?.name ?? '';

  /** Keeps track of the current URL. */
  currentUrl = toSignal(
    this._router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this._router.url),
      startWith(this._router.url) // Initial value
    ),
    { initialValue: this._router.url }
  );

  /** Identifier of the product being worked on, from the route tree. */
  currentProductId = this._context.productId;

  /**
   * Constructor of the component.
   * Detects the change in the route and set the combox accordingly
   * (If we exit the products route, we must reset it).
   */
  /** Computed signal for the current product's logo URL. */
  currentProductLogoUrl = computed(() => {
    const product = this.currentProduct();
    if (!product?.logoS3Key) return null;
    return this.logoUrls()[product.logoS3Key] ?? null;
  });

  constructor() {
    effect(() => {
      const productId = this.currentProductId();
      const products = this.products();

      if (productId && products.length > 0) {
        const foundProduct = products.find(product => product.id === productId);
        this.currentProduct.set(foundProduct);
      } else {
        this.currentProduct.set(undefined);
      }
    });

    // Load presigned URLs for product logos.
    effect(() => {
      const products = this.products();
      const s3Keys = products
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
   * Opens the workspace of the product chosen in the combobox.
   * @param productId the identifier of the chosen product.
   */
  onProductChange(productId: string | null): void {
    const product = this.products().find(candidate => candidate.id === productId);
    if (product && product.id !== this.currentProductId()) {
      this.productSelected(product);
    }
  }

  /**
   * Handles product selection.
   * @param product the selected product.
   */
  productSelected(product: CoreResponseProductDto): void {
    const currentProductId = this.currentProductId();
    if (currentProductId) {
      const newUrl = this._router.url.replace(
        `/products/workspaces/${currentProductId}`,
        `/products/workspaces/${product.id}`
      );
      this._router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this._router.navigateByUrl(newUrl);
      });
    } else {
      this._router.navigate(['products', 'workspaces', product.id]);
    }
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
