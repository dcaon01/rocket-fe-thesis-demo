import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CognitoUtilsService } from '../../../../../auth';
import { Profile } from '../../../../enums/profile.enum';

/**
 * Redirection component to handle workspace redirection.
 * This component redirects users to the first active page
 * of the workspace principally after selecting a product.
 */
@Component({
  selector: 'rocket-redirection',
  imports: [],
  template: '', // No template needed for redirection
})
export class RedirectionComponent {
  /** Router service instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** The Cognito utilities service instance. */
  private readonly _cognitoUtils = inject(CognitoUtilsService);

  /** Signal to hold the user groups, null until the session is read. */
  userGroups = toSignal<string[] | null>(
    this._cognitoUtils.getUserIdentifiers().pipe(
      map((userIdentifiers) => userIdentifiers.groups || []),
      catchError((error) => {
        console.error('Error checking user roles:', error);
        void this._router.navigate(['/login']);
        return of([] as string[]); // Explicit type
      })
    ),
    { initialValue: null }
  );

  /** Signal to hold the current product ID. */
  currentProductId = toSignal(
    this._activatedRoute.paramMap.pipe(
      map((paramMap) => {
        return paramMap.get('productId');
      })
    ),
    { initialValue: null }
  );

  /**
   * Constructor of the redirection component.
   */
  constructor() {
    effect(() => {
      const groups = this.userGroups();
      const userProductId = this.currentProductId();
      if (!groups) return;

      // Land on the product dashboard, as the global area does; the fallback keeps a profile
      // without access from hitting the wildcard route and bouncing back to the global dashboard.
      const dashboardProfiles: string[] = [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting];
      if (groups.some(group => dashboardProfiles.includes(group))) {
        void this._router.navigate(['products', 'workspaces', userProductId, 'dashboard']);
        return;
      }

      // A reseller has no product dashboard: it lands on the tenants of its perimeter.
      const resellerProfiles: string[] = [Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales];
      if (groups.some(group => resellerProfiles.includes(group))) {
        void this._router.navigate(['products', 'workspaces', userProductId, 'tenants']);
        return;
      }
      void this._router.navigate(['access-denied']);
    });
  }
}
