import { inject, Injectable } from "@angular/core";
import {
  AuthenticationDetails,
  ChallengeName,
  CognitoUser,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  from,
  Observable,
  Observer,
  switchMap,
} from "rxjs";
import {
  ConfirmPasswordEnum,
  ForgotPasswordEnum,
  ResetPasswordEnum,
  SignInEnum,
  SignUpEnum,
} from "../enums/auth-enums";
import {
  CognitoConfirmPasswordResult,
  CognitoForgotPasswordResult,
  CognitoResetPasswordResult,
  CognitoSignInResult,
  CognitoSignUpResult,
} from "../interfaces/auth-interfaces";
import { CognitoUtilsService } from "./cognito-utils.service";
import { PendingAuthService } from "./pending-user.service";

/**
 * Service that handles AWS Cognito authentication operations including sign-in,
 * sign-up, password management, and session validation.
 */
@Injectable({
  providedIn: "root",
})
export class AuthService {
  /** The utility service for cognito. */
  private readonly _cognitoUtilsService = inject(CognitoUtilsService);

  /** The pending auth service for handling users requiring further actions. */
  private readonly _pendingAuth = inject(PendingAuthService);

  /** Subject to track authentication status. */
  private readonly _isAuthenticatedSubject = new BehaviorSubject(false);

  /** Observable for authentication status changes. */
  private readonly _isAuthenticated$ = this._isAuthenticatedSubject.pipe(
    distinctUntilChanged(),
  );

  /** Subject to track loading state of authentication operations. */
  private readonly _isLoadingSubject = new BehaviorSubject(false);

  /** Observable for loading state changes. */
  private readonly _isLoading$ = this._isLoadingSubject.pipe(
    distinctUntilChanged(),
  );

  /**
   * Current Cognito user instance, set after successful authentication
   */
  cognitoUser: CognitoUser | undefined;

  /**
   * Temporary storage for credentials used for automatic login after OTP confirmation
   */
  private _pendingCredentials: { email: string; password: string } | null = null;

  /**
   * Initializes the AuthService and checks the current user session.
   */
  constructor() {
    void this._checkUserSession();
  }

  /**
   * Authenticates a user with email and password using AWS Cognito.
   * Handles various authentication flows including new password requirements and TOTP.
   * @param email - User's email address
   * @param password - User's password
   * @returns Observable that emits authentication result with different types based on the flow
   */
  public signIn(
    email: string,
    password: string,
  ): Observable<CognitoSignInResult> {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    this.cognitoUser = new CognitoUser({
      Username: email,
      Pool: this._cognitoUtilsService.getUserPool(),
    });

    return new Observable<CognitoSignInResult>(
      (observer: Observer<CognitoSignInResult>) => {
        this.cognitoUser?.authenticateUser(authenticationDetails, {
          onSuccess: (result: CognitoUserSession) => {
            this._onLoginSuccess(result, observer);
          },
          newPasswordRequired: () => {
            // IMPORTANTE: Salva il cognitoUser per usarlo dopo
            if (this.cognitoUser) {
              this._pendingAuth.setPendingUser(this.cognitoUser);
            }
            observer.next({ type: SignInEnum.NEW_PASSWORD_REQUIRED });
            observer.complete();
          },
          totpRequired: (
            challengeName: ChallengeName,
            challengeParameters: Record<string, string>,
          ) => {
            observer.next({
              type: SignInEnum.TOTP_REQUIRED,
              result: {
                challengeName,
                challengeParameters,
              },
            });
            observer.complete();
          },
          onFailure: (error: Error) => {
            observer.error({ type: SignInEnum.FAIL, result: error });
          },
        });
      },
    );
  }

  /**
   * Initiates the forgot password flow by sending a verification code to the user's email.
   * @param username - User's username or email
   * @returns Observable that emits the forgot password result
   */
  forgotPassword(username: string): Observable<CognitoForgotPasswordResult> {
    const userData = {
      Username: username,
      Pool: this._cognitoUtilsService.getUserPool(),
    };

    const cognitoUser = new CognitoUser(userData);

    return new Observable<CognitoForgotPasswordResult>((observer) => {
      cognitoUser.forgotPassword({
        onSuccess: () => {
          observer.next({ type: ForgotPasswordEnum.SUCCESS });
          observer.complete();
        },
        inputVerificationCode: () => {
          observer.next({ type: ForgotPasswordEnum.INPUT_VERIFICATION_CODE });
          observer.complete();
        },
        onFailure: (error) => {
          observer.error({ type: ForgotPasswordEnum.FAIL, result: error });
        },
      });
    });
  }

  /**
   * Resets user password when a temporary password is provided (first-time login scenario).
   * Automatically signs in with the temporary password and sets the new password.
   * @param email - User's email address
   * @param temporaryPassword - Temporary password provided by admin or reset flow
   * @param newPassword - New password to set for the user
   * @returns Observable that emits the password reset result with new session
   */
  resetPassword(
    email: string,
    temporaryPassword: string,
    newPassword: string,
  ): Observable<CognitoResetPasswordResult> {
    return this.signIn(email, temporaryPassword).pipe(
      filter((event) => event.type === SignInEnum.NEW_PASSWORD_REQUIRED),
      switchMap(
        () =>
          new Observable<CognitoResetPasswordResult>((observer) => {
            this.cognitoUser?.completeNewPasswordChallenge(
              newPassword,
              undefined,
              {
                onSuccess: (session: CognitoUserSession) => {
                  void this._checkUserSession().then(() => {
                    observer.next({
                      type: ResetPasswordEnum.SUCCESS,
                      result: session,
                    });
                    observer.complete();
                  });
                },
                onFailure: (error: Error) => {
                  observer.error({ type: SignInEnum.FAIL, result: error });
                },
              },
            );
          }),
      ),
    );
  }

  /**
   * Confirms a new password using the verification code sent via email during forgot password flow.
   * @param email - User's email address
   * @param verificationCode - Verification code sent to user's email
   * @param password - New password to set
   * @returns Observable that emits the password confirmation result
   */
  confirmNewPassword(
    email: string,
    verificationCode: string,
    password: string,
  ): Observable<CognitoConfirmPasswordResult> {
    const userData = {
      Username: email,
      Pool: this._cognitoUtilsService.getUserPool(),
    };

    const cognitoUser = new CognitoUser(userData);

    return new Observable<CognitoConfirmPasswordResult>((observer) => {
      cognitoUser.confirmPassword(verificationCode, password, {
        onSuccess: (result) => {
          observer.next({ type: ConfirmPasswordEnum.SUCCESS, result });
          observer.complete();
        },
        onFailure: (error: Error) => {
          observer.error({ type: ForgotPasswordEnum.FAIL, result: error });
        },
      });
    });
  }

  /**
   * Changes the password for the currently authenticated user.
   * Requires the user to provide their current password for security verification.
   * @param oldPassword - User's current password
   * @param newPassword - New password to set
   * @returns Observable that completes when password is successfully changed
   */
  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    const user = this._cognitoUtilsService.getCurrentUser();

    if (!user) {
      return new Observable((observer) => {
        observer.error(new Error("No authenticated user"));
      });
    }

    return new Observable<void>((observer) => {
      user.getSession((sessionError: Error | null, session: CognitoUserSession | null) => {
        if (sessionError || !session) {
          observer.error(sessionError || new Error("No valid session"));
          return;
        }

        user.changePassword(oldPassword, newPassword, (error) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next();
            observer.complete();
          }
        });
      });
    });
  }

  /**
   * Changes password for an already authenticated user without requiring old password.
   * Uses the current session to set a new password.
   * @param newPassword new password to set for the user.
   * @returns Observable that emits when password is successfully changed.
   */
  changePasswordWithoutOld(newPassword: string): Observable<void> {
    // Prima prova a prendere il pending user
    let user = this._pendingAuth.getPendingUser();

    // Se non c'è, prova con il current user
    if (!user) {
      user = this._cognitoUtilsService.getCurrentUser();
    }

    if (!user) {
      return new Observable((observer) => {
        observer.error(new Error("No authenticated user"));
      });
    }

    return new Observable<void>((observer) => {
      // Non serve getSession perché siamo già in una challenge attiva
      user!.completeNewPasswordChallenge(newPassword, {}, {
        onSuccess: (session: CognitoUserSession) => {
          // Pulisci il pending user
          this._pendingAuth.clear();

          // Aggiorna lo stato di autenticazione
          void this._checkUserSession().then(() => {
            observer.next();
            observer.complete();
          });
        },
        onFailure: (error: Error) => {
          observer.error(error);
        },
      });
    });
  }

  /**
   * Logs out the currently authenticated user and clears their session.
   * Updates the authentication state after successful logout.
   * @returns Observable that completes when user is logged out
   */
  logout(): Observable<void> {
    const user = this._cognitoUtilsService.getCurrentUser();

    if (!user) {
      return from(this._checkUserSession());
    }
    return new Observable((observer) => {
      user.signOut(() => {
        void this._checkUserSession().then(() => {
          observer.next();
          observer.complete();
        });
      });
    });
  }

  /**
   * Registers a new user with email and password.
   * Stores credentials temporarily for automatic login after OTP confirmation.
   * @param email - User's email address
   * @param password - User's password
   * @returns Observable that emits the sign-up result
   */
  signUp(email: string, password: string): Observable<CognitoSignUpResult> {
    this._pendingCredentials = { email, password };

    return new Observable<CognitoSignUpResult>((observer) => {
      this._cognitoUtilsService
        .getUserPool()
        .signUp(email, password, [], [], (error) => {
          if (error) {
            this._pendingCredentials = null;
            observer.error({ type: SignUpEnum.FAIL, result: error });
          } else {
            observer.next({ type: SignUpEnum.SUCCESS });
            observer.complete();
          }
        });
    });
  }

  /**
   * Confirms user registration using the OTP code sent to their email.
   * Automatically signs in the user after successful confirmation if credentials are available.
   * @param confirmationCode - OTP verification code sent to user's email
   * @returns Observable that completes when registration is confirmed
   */
  confirmSignUp(confirmationCode: string): Observable<void> {
    return new Observable<void>((observer) => {
      this.cognitoUser?.confirmRegistration(confirmationCode, true, (error) => {
        if (error) {
          observer.error(error);
        } else {
          if (this._pendingCredentials) {
            const { email, password } = this._pendingCredentials;
            this._pendingCredentials = null;

            this.signIn(email, password).subscribe({
              next: () => {
                observer.next();
                observer.complete();
              },
              error: () => {
                observer.next();
                observer.complete();
              },
            });
          } else {
            observer.next();
            observer.complete();
          }
        }
      });
    });
  }

  /**
   * Resends the confirmation code to the user's email.
   * Useful when the original OTP has expired or was not received.
   * @returns Observable that completes when code is successfully resent
   */
  resendCode(): Observable<void> {
    return new Observable<void>((observer) => {
      this.cognitoUser?.resendConfirmationCode((error) => {
        if (error) {
          observer.error(error);
        } else {
          observer.next();
          observer.complete();
        }
      });
    });
  }

  /**
   * Checks if the current user is authenticated by validating their session.
   * Triggers a session check and returns the updated authentication state.
   * @returns Observable that emits true if user is authenticated, false otherwise
   */
  public isAuthenticated(): Observable<boolean> {
    return from(this._checkUserSession()).pipe(
      switchMap(() => this._isAuthenticated$),
    );
  }

  /**
   * Returns the current loading state of authentication operations.
   * @returns Observable that emits true when authentication operations are in progress
   */
  public isLoading(): Observable<boolean> {
    return this._isLoading$;
  }

  /**
   * Handles successful login by updating the session state and notifying observers.
   * @param session - The authenticated user's Cognito session
   * @param observer - Observer to notify with the sign-in result
   */
  private _onLoginSuccess(
    session: CognitoUserSession,
    observer: Observer<CognitoSignInResult>,
  ): void {
    void this._checkUserSession().then(() => {
      observer.next({ type: SignInEnum.SUCCESS, result: session });
      observer.complete();
    });
  }

  /**
   * Validates the current user's session with Cognito.
   * Updates authentication and loading states based on session validity.
   * Called automatically on service initialization and after authentication operations.
   */
  private async _checkUserSession(): Promise<void> {
    this._isLoadingSubject.next(true);
    let isValid = false;
    try {
      const session = await this._cognitoUtilsService.getSession();
      isValid = session?.isValid() ?? false;
      console.debug("AuthService: Session is valid", isValid);
    } catch (e) {
      console.error("AuthService: error", e);
    } finally {
      this._isAuthenticatedSubject.next(isValid);
      this._isLoadingSubject.next(false);
    }
  }
}