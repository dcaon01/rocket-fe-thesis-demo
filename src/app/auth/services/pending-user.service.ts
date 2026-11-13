// auth/services/pending-auth.service.ts
import { Injectable, signal } from '@angular/core';
import { CognitoUser } from 'amazon-cognito-identity-js';

/**
 * Service to manage pending authenticated users requiring further actions (e.g., password change).
 */
@Injectable({
  providedIn: 'root'
})
export class PendingAuthService {
  /** Signal to hold the pending Cognito user */
  private _pendingUser = signal<CognitoUser | null>(null);

  /**
   * Sets the pending Cognito user.
   * @param user CognitoUser instance to set as pending.
   */
  setPendingUser(user: CognitoUser) {
    this._pendingUser.set(user);
  }

  /** Retrieves the pending Cognito user.
   * @returns CognitoUser instance or null if none is pending.
   */
  getPendingUser(): CognitoUser | null {
    return this._pendingUser();
  }

  /**
   * Clears the pending Cognito user.
   */
  clear() {
    this._pendingUser.set(null);
  }
}