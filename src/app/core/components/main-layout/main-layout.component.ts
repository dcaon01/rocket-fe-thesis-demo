import { Component, computed, effect, ElementRef, inject, linkedSignal, Signal, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import Intercom, { onUnreadCountChange } from '@intercom/messenger-js-sdk';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBuilding2, lucideCalendarClock, lucideChartColumnIncreasing, lucideChevronRight, lucideClipboardList, lucideContact, lucideEarth, lucideFileText, lucideHandCoins, lucideHourglass, lucideIdCard, lucideLayers, lucideLayoutDashboard, lucideLibrary, lucideMegaphone, lucideNetwork, lucidePackageSearch, lucideReceipt, lucideReceiptEuro, lucideScrollText, lucideServer, lucideSettings, lucideSquareCode, lucideUserCheck, lucideUserCog, lucideUsers } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCollapsible, HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { catchError, filter, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CognitoUtilsService } from '../../../auth/services/cognito-utils.service';
import { INTEGRATIONS_ENABLED } from '../../constants/features';
import { GLOBAL_NAVIGATION } from '../../constants/navigation/global-navigation';
import { PRODUCT_WORKSPACE_NAVIGATION } from '../../constants/navigation/product-workspace-navigation';
import { RESELLER_WORKSPACE_NAVIGATION } from '../../constants/navigation/reseller-workspace-navigation';
import { AppArea } from '../../enums/app-area.enum';
import { NavigationItem } from '../../interfaces/navigation-item.interface';
import { AccountApiService } from '../../services/api-services/account/account-api.service';
import { AppContextService } from '../../services/app-context/app-context.service';
import { ProductsCacheService } from '../../services/cache/products-cache.service';
import { LoadingService } from '../../services/loading/loading.service';
import { UserContextService } from '../../services/user-context/user-context.service';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/**
 * Main layout shown to authenticated users.
 */
@Component({
  selector: 'rocket-main-layout',
  imports: [
    ...HlmSidebarImports,
    ...HlmToasterImports,
    ...HlmCollapsibleImports,
    HlmIcon,
    NgIcon,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LoadingOverlayComponent,
    HlmCollapsible,
    ...HlmButtonImports,
    TopbarComponent,
    UserMenuComponent
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideBuilding2,
      lucideCalendarClock,
      lucideChartColumnIncreasing,
      lucideChevronRight,
      lucideClipboardList,
      lucideContact,
      lucideEarth,
      lucideFileText,
      lucideHandCoins,
      lucideHourglass,
      lucideIdCard,
      lucideLayers,
      lucideLayoutDashboard,
      lucideLibrary,
     
     
      lucideMegaphone,
     
      lucideNetwork,
      lucidePackageSearch,
      lucideReceipt,
      lucideReceiptEuro,
      lucideScrollText,
      lucideServer,
      lucideSettings,
      lucideSquareCode,
      lucideUserCheck,
      lucideUserCog,
      lucideUsers,
    })
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  /** The router instance. */
  private readonly _router = inject(Router);

  /** The Cognito utilities service instance. */
  private readonly _cognitoUtils = inject(CognitoUtilsService);

  /** The loading service instance. */
  private readonly _loadingService = inject(LoadingService);

  /** The account API service instance. */
  private readonly _accountApiService = inject(AccountApiService);

  /** The user context service instance. */
  private readonly _userContext = inject(UserContextService);

  /** The application context service instance: which area, which workspace. */
  private readonly _context = inject(AppContextService);

  /** The products cache service instance. */
  private readonly _productsCache = inject(ProductsCacheService);

  /** Scrolling panel of the pages: it stays across navigations, so its position is reset by hand. */
  private readonly _pagePanel = viewChild<ElementRef<HTMLElement>>('pagePanel');

  /** Signal representing the loading state. */
  loadingState: Signal<boolean> = this._loadingService.isLoading;

  /** Signal to hold the navigation items to be shown based on user roles. */
  shownNavigationItems = signal<NavigationItem[]>([]);

  /** Whether the Intercom unread listener is already registered. */
  private _isUnreadListenerRegistered = false;

  /** Whether the user has Intercom messages not read yet. */
  hasUnreadMessages = signal<boolean>(false);

  /** Signal to track the current URL for active link highlighting. */
  currentUrl = toSignal(
    this._router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => (event as NavigationEnd).url)
    ),
    { initialValue: this._router.url }
  );

  /** Label of the sidebar group currently open, null only when the area has no groups. */
  openGroup = linkedSignal<{ items: NavigationItem[]; url: string }, string | null>({
    source: () => ({ items: this.shownNavigationItems(), url: this.currentUrl() }),
    computation: ({ items }, previous) => this._pickOpenGroup(items, previous?.value ?? null)
  });

  /** Identifier of the product being worked on, null outside the product workspace. */
  currentProductId = this._context.productId;

  /** Identifier of the reseller being worked on, null outside the reseller workspace. */
  currentResellerId = this._context.resellerId;

  /** Current product, resolved from the cache. */
  currentProduct = this._context.currentProduct;

  /** Whether the user is inside one of the two workspaces. */
  isInWorkspace = computed(() => this._context.area() !== AppArea.Global);

  /** Whether the user works at a reseller, whose home is its own workspace. */
  isReseller = this._userContext.isReseller;

  /** Signal to hold the user groups. */
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

  /**
   * Constructor.
   * Initializes the shown navigation items based on user roles and current product context
   * (if selected).
   */
  constructor() {
    // Bring the page panel back to the top on every new page; a change of the query parameters alone keeps it.
    const currentPath = computed(() => this.currentUrl().split('?')[0]);
    effect(() => {
      currentPath();

      untracked(() => this._pagePanel()?.nativeElement.scrollTo({ top: 0 }));
    });

    // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
    if (INTEGRATIONS_ENABLED) {
      this._accountApiService.currentUser$.subscribe({
        next: (user) => {
          const fullName = [user.name, user.familyName].filter(Boolean).join(' ') || user.email;
          Intercom({
            app_id: environment.intercomAppId,
            user_id: user.username,
            email: user.email,
            name: fullName,
            hide_default_launcher: true
          });
          this._listenToUnreadMessages();
        },
        error: () => {
          Intercom({ app_id: environment.intercomAppId, hide_default_launcher: true });
          this._listenToUnreadMessages();
        }
      });
    }

    effect(() => {
      this.userGroups(); // Track user groups signal
      this.shownNavigationItems.set(this._filterNavigationItems(this._navigationForArea()));
    })
  }

  /**
   * Registers the Intercom unread listener once, after the first boot.
   * The current user can be emitted again, and each registration would add a listener.
   */
  private _listenToUnreadMessages(): void {
    if (this._isUnreadListenerRegistered) {
      return;
    }
    this._isUnreadListenerRegistered = true;
    onUnreadCountChange((count: number) => this.hasUnreadMessages.set(count > 0));
  }

  /**
   * Picks the sidebar of the area currently being worked in.
   * @returns the navigation items of the current area.
   */
  private _navigationForArea(): NavigationItem[] {
    switch (this._context.area()) {
      case AppArea.ProductWorkspace:
        return PRODUCT_WORKSPACE_NAVIGATION;
      case AppArea.ResellerWorkspace:
        return RESELLER_WORKSPACE_NAVIGATION;
      default:
        return GLOBAL_NAVIGATION;
    }
  }

  /**
   * Filters navigation items (and their children) by role, account type and product flags,
   * dropping groups left without visible children and showing a group left with one child as that child.
   * @param items the navigation items to filter.
   * @returns the visible navigation items.
   */
  private _filterNavigationItems(items: NavigationItem[]): NavigationItem[] {
    return items
      .filter(item => this.isItemVisible(item))
      .map(item => item.children
        ? { ...item, children: item.children.filter(child => this.isItemVisible(child)) }
        : item)
      .filter(item => !item.children || item.children.length > 0)
      .map(item => item.children?.length === 1 ? item.children[0] : item);
  }

  /**
   * Picks the group to keep open: the one holding the active page, otherwise
   * the one already open if still shown, otherwise the first.
   * @param items the navigation items currently shown.
   * @param previous the label of the group open before.
   * @returns the label of the group to open, null when there are no groups.
   */
  private _pickOpenGroup(items: NavigationItem[], previous: string | null): string | null {
    const groups = items.filter(item => item.expandable && item.children?.length);
    const active = groups.find(group =>
      group.children!.some(child => this.isRouteActive(this.getCompleteUrl(child)))
    );

    if (active) {
      return active.label;
    }
    if (groups.some(group => group.label === previous)) {
      return previous;
    }
    return groups[0]?.label ?? null;
  }

  /**
   * Checks whether a navigation item is visible for the current user and product context.
   * @param item the navigation item to check.
   * @returns true if the item passes role, account type and product flag conditions.
   */
  isItemVisible(item: NavigationItem): boolean {
    if (item.rolesAllowed && !this.hasRole(item.rolesAllowed)) {
      return false;
    }

    const accountType = this._userContext.accountType();
    if (item.accountTypesAllowed && (!accountType || !item.accountTypesAllowed.includes(accountType))) {
      return false;
    }

    if (item.requiredProductFlag && !this.currentProduct()?.[item.requiredProductFlag]) {
      return false;
    }

    return true;
  }

  /**
   * Checks if the user has at least one of the allowed roles.
   * @param allowedRoles the allowed roles to check against.
   * @return true if the user has at least one of the allowed roles, false otherwise.
   */
  hasRole(allowedRoles: string[]): boolean {
    const userGroups = this.userGroups();

    if (!userGroups || userGroups.length === 0) {
      return false;
    }

    return allowedRoles.some(role => userGroups.includes(role));
  }

  /**
   * Opens a sidebar group and closes the one that was open. Clicking the open
   * group leaves it open, so the sidebar always shows exactly one.
   * @param label the label of the group to open.
   */
  openGroupByLabel(label: string): void {
    this.openGroup.set(label);
  }

  /** 
   * Gets the complete URL for a navigation item, appending the productId if in a product context.
   * @param item the navigation item.
   * @returns the complete URL as a string.
   */
  getCompleteUrl(item: NavigationItem): string {
    return this._context.resolveUrl(item.url ?? '');
  }

  /**
   * Checks if a route is active (including child routes).
   * @param url the URL to check.
   * @returns true if the current URL starts with the given URL.
   */
  isRouteActive(url: string): boolean {
    return this.currentUrl().startsWith(url);
  }

  /**
   * Navigates back to the products list.
   */
  goToProducts(): void {
    this._router.navigate(['/products']);
  }

  /**
   * Navigates back to the resellers list.
   */
  goToResellers(): void {
    this._router.navigate(['/resellers']);
  }

  /**
   * Navigates to the dashboard page.
   */
  goToDashboard(): void {
    this._router.navigate(['/dashboard']);
  }
}
