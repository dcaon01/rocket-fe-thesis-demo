import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AppArea } from '../../enums/app-area.enum';
import { ProductsCacheService } from '../cache/products-cache.service';

/**
 * Single place answering "where am I": which area, which product, which reseller.
 *
 * It walks the route tree instead of matching the address with a regular
 * expression, the way BreadcrumbsService does. The difference matters: reading
 * the address means every renamed path silently breaks the context, while the
 * route data keeps saying what it is.
 *
 * One service for both workspaces, not two: the workspace is a single idea with
 * two incarnations, and the pages shared between them need to ask which
 * perimeter they are in with one question.
 */
@Injectable({
  providedIn: 'root'
})
export class AppContextService {
  /** Router instance used to react to navigation. */
  private readonly _router = inject(Router);

  /** ActivatedRoute instance used to walk the route tree. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Products cache service instance. */
  private readonly _productsCache = inject(ProductsCacheService);

  /** Area declared by the deepest route that declares one. */
  private readonly _area = signal<AppArea>(AppArea.Global);

  /** Route parameters collected along the whole tree. */
  private readonly _params = signal<Record<string, string>>({});

  /** Current application area. */
  readonly area = this._area.asReadonly();

  /** Identifier of the product being worked on, null outside the product workspace. */
  readonly productId = computed<string | null>(() =>
    this._area() === AppArea.ProductWorkspace ? this._params()['productId'] ?? null : null
  );

  /** Identifier of the reseller being worked on, null outside the reseller workspace. */
  readonly resellerId = computed<string | null>(() =>
    this._area() === AppArea.ResellerWorkspace ? this._params()['resellerId'] ?? null : null
  );

  /** Current product, resolved from the cache. */
  readonly currentProduct = computed(() => {
    const id = this.productId();
    return id ? this._productsCache.products().find(product => product.id === id) : undefined;
  });

  /** Base path of the current workspace, empty string in the global area. */
  readonly basePath = computed<string>(() => {
    const productId = this.productId();
    if (productId) {
      return `/products/workspaces/${productId}`;
    }
    const resellerId = this.resellerId();
    if (resellerId) {
      return `/resellers/workspaces/${resellerId}`;
    }
    return '';
  });

  /**
   * Constructor for AppContextService.
   * Recomputes the context on every navigation.
   */
  constructor() {
    this._router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => this._updateContext());

    this._updateContext();
  }

  /**
   * Builds an absolute url from a url relative to the current workspace.
   * @param relativeUrl the url relative to the workspace, or an absolute one in the global area.
   * @returns the absolute url to navigate to.
   */
  resolveUrl(relativeUrl: string): string {
    return `${this.basePath()}${relativeUrl}`;
  }

  /**
   * Walks the route tree from the root to the leaf, collecting the declared
   * area and every route parameter. The deepest declaration wins, so a nested
   * route can narrow the area of its parent.
   */
  private _updateContext(): void {
    let route: ActivatedRoute | null = this._activatedRoute.root;
    let area = AppArea.Global;
    const params: Record<string, string> = {};

    while (route) {
      // The service can be built before the first navigation resolves, when the
      // router state has no snapshot yet: the area stays global until the first
      // NavigationEnd arrives and this runs again.
      const snapshot = route.snapshot;
      if (!snapshot) {
        break;
      }
      const declared = snapshot.data['area'] as AppArea | undefined;
      if (declared) {
        area = declared;
      }
      Object.assign(params, snapshot.params);
      route = route.firstChild;
    }

    this._area.set(area);
    this._params.set(params);
  }
}
