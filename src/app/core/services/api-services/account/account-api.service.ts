import { inject, Injectable } from '@angular/core';
import { merge, Observable, of, shareReplay, Subject, switchMap } from 'rxjs';
import { CognitoUtilsService } from '../../../../auth/services/cognito-utils.service';
import { CognitoCognitoService, CognitoCognitoUserResponseDto, CognitoCognitoUserUpdateDto, CognitoMessageResponseDto } from '../../../../../../libs/api/src';

/**
 * Service for managing current user account API calls.
 */
@Injectable({
  providedIn: 'root'
})
export class AccountApiService {
  /** Cognito service for API calls. */
  private readonly _cognitoService = inject(CognitoCognitoService);

  /** Cognito utils service for getting user identifiers. */
  private readonly _cognitoUtilsService = inject(CognitoUtilsService);

  /** Subject to trigger a re-fetch of the current user. */
  private readonly _refreshCurrentUser$ = new Subject<void>();

  /** Shared observable that emits the current user data and re-fetches on refresh. */
  readonly currentUser$: Observable<CognitoCognitoUserResponseDto> = merge(of(void 0), this._refreshCurrentUser$).pipe(
    switchMap(() => this._cognitoUtilsService.getUserIdentifiers()),
    switchMap(identifiers => this._cognitoService.cognitoControllerGetUser({ id: identifiers.sub })),
    shareReplay(1)
  );

  /**
   * Triggers a re-fetch of the current user data.
   */
  refreshCurrentUser(): void {
    this._refreshCurrentUser$.next();
  }

  /**
   * Fetches the current user's account data.
   * @returns An observable emitting the current user's data.
   */
  getCurrentUser(): Observable<CognitoCognitoUserResponseDto> {
    return this._cognitoUtilsService.getUserIdentifiers().pipe(
      switchMap((identifiers) =>
        this._cognitoService.cognitoControllerGetUser({ id: identifiers.sub })
      )
    );
  }

  /**
   * Updates the current user's account data.
   * @param userData The data to update.
   * @returns An observable emitting the update response.
   */
  updateCurrentUser(userData: CognitoCognitoUserUpdateDto): Observable<CognitoMessageResponseDto> {
    return this._cognitoUtilsService.getUserIdentifiers().pipe(
      switchMap((identifiers) =>
        this._cognitoService.cognitoControllerUpdateUser({
          tenant: identifiers.tenant || 'default',
          id: identifiers.sub,
          body: userData
        })
      )
    );
  }
}
