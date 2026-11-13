import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CognitoUtilsService } from '../../auth/services/cognito-utils.service';
import { AccountType } from '../enums/account-type.enum';

/**
 * Guard that manages route access based on the user's account type.
 * @param allowedTypes account types allowed in the route
 * @returns canActivate function that checks if the user has one of the allowed account types.
 */
export const accountTypeGuard = (allowedTypes: AccountType[]): CanActivateFn => {
  return () => {
    const cognitoUtils = inject(CognitoUtilsService);
    const router = inject(Router);

    return cognitoUtils.getUserIdentifiers().pipe(
      map((userIdentifiers) => {
        if (userIdentifiers.accountType && allowedTypes.includes(userIdentifiers.accountType)) {
          return true;
        }

        console.warn('Access denied: user does not have required account type');
        return router.parseUrl('/');
      }),
      catchError((error) => {
        console.error('Error checking user account type:', error);
        return of(router.parseUrl('/login'));
      })
    );
  };
};

/**
 * Guard protecting Keus-only routes: redirects reseller collaborators to the home page.
 * Still needed alongside profileGuard, because the two answer different
 * questions: the profile says what a user can do, the account type says whose
 * data it may see. A reseller owner is a legitimate profile that must never
 * reach a Keus-wide page.
 */
export const resellerScopeGuard: CanActivateFn = accountTypeGuard([AccountType.Collaborator]);
