import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { catchError, map, Observable, of, switchMap, take, throwError } from 'rxjs';
import { CognitoUtilsService } from '../../auth/services/cognito-utils.service';
import { AccountType } from '../enums/account-type.enum';
import { AccountApiService } from '../services/api-services/account/account-api.service';
import { ResellersApiService } from '../services/api-services/resellers/resellers-api.service';

/**
 * Guard sending reseller users from the global dashboard to their own workspace,
 * so the sign-in, the logo and every link to the dashboard land there.
 */
export const resellerHomeGuard: CanActivateFn = () => {
  const cognitoUtils = inject(CognitoUtilsService);
  const accountApiService = inject(AccountApiService);
  const resellersApiService = inject(ResellersApiService);
  const router = inject(Router);

  return cognitoUtils.getUserIdentifiers().pipe(
    switchMap((userIdentifiers) => {
      if (userIdentifiers.accountType === AccountType.Reseller) {
        return _ownResellerId(accountApiService, resellersApiService).pipe(
          map(resellerId => router.createUrlTree(['/resellers', 'workspaces', resellerId]))
        );
      }

      return of(true);
    }),
    catchError((error) => {
      console.error('Error resolving the reseller workspace:', error);
      return of(router.parseUrl('/access-denied'));
    })
  );
};

/**
 * Guard sending reseller users from a page of the global area to the same page in their own workspace, such as the
 * company or product links of the pages they share with Keus. Keus collaborators go on.
 * @param _route the route snapshot.
 * @param state the router state, carrying the url asked for.
 */
export const resellerOwnWorkspaceGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const cognitoUtils = inject(CognitoUtilsService);
  const accountApiService = inject(AccountApiService);
  const resellersApiService = inject(ResellersApiService);
  const router = inject(Router);

  return cognitoUtils.getUserIdentifiers().pipe(
    switchMap(userIdentifiers => userIdentifiers.accountType !== AccountType.Reseller
      ? of(true)
      : _ownResellerId(accountApiService, resellersApiService).pipe(
        map(resellerId => router.parseUrl(`/resellers/workspaces/${resellerId}${state.url}`))
      )),
    catchError((error) => {
      console.error('Error resolving the reseller workspace:', error);
      return of(router.parseUrl('/access-denied'));
    })
  );
};

/**
 * Guard keeping reseller users inside their own workspace: any other reseller id
 * brings them back to theirs. Keus collaborators open the workspaces of the
 * resellers they can read: the server refuses the others, e.g. a Keus salesperson's
 * resellers owned by someone else, and the guard turns the refusal into access denied.
 * @param route the route snapshot carrying the reseller id.
 */
export const resellerWorkspaceGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const cognitoUtils = inject(CognitoUtilsService);
  const accountApiService = inject(AccountApiService);
  const resellersApiService = inject(ResellersApiService);
  const router = inject(Router);

  return cognitoUtils.getUserIdentifiers().pipe(
    switchMap((userIdentifiers) => userIdentifiers.accountType !== AccountType.Reseller
      ? resellersApiService.getReseller(route.params['resellerId']).pipe(map(() => true))
      : _ownResellerId(accountApiService, resellersApiService).pipe(
        map(resellerId => resellerId === route.params['resellerId']
          ? true
          : router.createUrlTree(['/resellers', 'workspaces', resellerId]))
      )),
    catchError((error) => {
      console.error('Error checking the reseller workspace:', error);
      // Only a refusal means access denied: an outage cancels the navigation instead.
      const refused = !(error instanceof HttpErrorResponse) || error.status === 403 || error.status === 404;
      return of(refused ? router.parseUrl('/access-denied') : false);
    })
  );
};

/**
 * Resolves the workspace id of the logged-in reseller user. The token carries
 * the profiles only: the code comes from the user profile, the id from the
 * reseller looked up by that code.
 * @param accountApiService the account API service.
 * @param resellersApiService the resellers API service.
 * @returns an observable of the reseller id.
 */
function _ownResellerId(accountApiService: AccountApiService, resellersApiService: ResellersApiService): Observable<string> {
  return accountApiService.currentUser$.pipe(
    take(1),
    switchMap(user => user.resellerCode
      ? resellersApiService.getResellerByCode(user.resellerCode)
      : throwError(() => new Error('Reseller user without a reseller code'))),
    map(reseller => reseller.id)
  );
}
