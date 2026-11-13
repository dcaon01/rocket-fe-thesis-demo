import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { CognitoUtilsService } from '../../auth/services/cognito-utils.service';
import { AccountType } from '../enums/account-type.enum';

/**
 * Tells whether a reseller is logged in, from the stored token only: the public pages read it without calling the API.
 * Call it in an injection context.
 * @returns a signal, false without a session or for a Keus collaborator.
 */
export function resellerSession(): Signal<boolean> {
  return toSignal(
    inject(CognitoUtilsService).getUserIdentifiers().pipe(
      map(identifiers => identifiers.accountType === AccountType.Reseller),
      catchError(() => of(false)),
    ),
    { initialValue: false },
  );
}
