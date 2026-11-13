import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { CognitoUtilsService } from '../../auth/services/cognito-utils.service';
import { AccountType } from '../enums/account-type.enum';
import { ResellerAccessService } from '../services/reseller-access/reseller-access.service';

/**
 * Guard sending the users of a blocked reseller to the blocking screen at every navigation: no contract, a contract
 * to activate, an ended one, or an invoice unpaid on the fifteenth day of its dunning. Keus collaborators pass.
 */
export const resellerAccessGuard: CanActivateChildFn = () => {
  const router = inject(Router);

  return _isBlocked().pipe(
    map(blocked => blocked ? router.parseUrl('/access-blocked') : true)
  );
};

/**
 * Guard keeping the blocking screen for the users of a blocked reseller: the others go back to their home.
 */
export const accessBlockedGuard: CanActivateFn = () => {
  const router = inject(Router);

  return _isBlocked().pipe(
    map(blocked => blocked ? true : router.parseUrl('/'))
  );
};

/**
 * Tells whether Rocket is blocked for the logged-in user, waiting for the access of its reseller.
 * @returns an observable emitting once whether Rocket is blocked; false for a Keus collaborator.
 */
function _isBlocked(): Observable<boolean> {
  const cognitoUtils = inject(CognitoUtilsService);
  const resellerAccess = inject(ResellerAccessService);

  return cognitoUtils.getUserIdentifiers().pipe(
    switchMap(identifiers => identifiers.accountType === AccountType.Reseller ? resellerAccess.blocked$() : of(false)),
    catchError(error => {
      console.error('Error checking the access of the reseller:', error);
      return of(false);
    })
  );
}
