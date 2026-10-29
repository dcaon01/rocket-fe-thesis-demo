import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { CognitoUtilsService } from '../../../auth/services/cognito-utils.service';
import { AccountType } from '../../enums/account-type.enum';
import { AccountApiService } from '../api-services/account/account-api.service';

/**
 * Service exposing the logged-in user's context (account type, profile, reseller code)
 * as signals, to be consumed consistently by layout, forms and pages.
 */
@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  /** The Cognito utilities service instance. */
  private readonly _cognitoUtils = inject(CognitoUtilsService);

  /** The account API service instance. */
  private readonly _accountApiService = inject(AccountApiService);

  /** Signal holding the account type derived from the token groups. */
  readonly accountType = toSignal(
    this._cognitoUtils.getUserIdentifiers().pipe(
      map(identifiers => identifiers.accountType),
      catchError(() => of(undefined))
    ),
    { initialValue: undefined }
  );

  /** Signal holding the current user profile (undefined while loading). */
  readonly currentUser = toSignal(
    this._accountApiService.currentUser$.pipe(
      catchError(() => of(null))
    ),
    { initialValue: undefined }
  );

  /** Signal indicating whether the user profile has been loaded. */
  readonly isUserProfileLoaded = computed(() => this.currentUser() !== undefined);

  /** Signal holding the reseller code from the user profile (not in the JWT). */
  readonly resellerCode = computed<string | undefined>(() => this.currentUser()?.resellerCode);

  /** Signal indicating whether the logged-in user is a reseller collaborator. */
  readonly isReseller = computed(() => this.accountType() === AccountType.Reseller);
}
