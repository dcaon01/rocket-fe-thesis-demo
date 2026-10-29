import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { CognitoUtilsService } from '../services/cognito-utils.service';

/**
 * Guard that manages route access based on user session state.
 * @param allowedStates allowed states to select the logic of the guard.
 * @returns canActivate function that checks the user's session and redirects accordingly.
 */
export const sessionGuard = (
  allowedStates: ('authenticated' | 'unauthenticated' | 'password-change-required')[]
): CanActivateFn => {
  return async (): Promise<boolean | UrlTree> => {
    const cognitoUtils = inject(CognitoUtilsService);
    const router = inject(Router);

    // A navigation carrying the password-change state comes from the login itself.
    const navigation = router.currentNavigation();
    const state = navigation?.extras?.state as { passwordChangeRequired?: boolean };

    if (state?.passwordChangeRequired && allowedStates.includes('password-change-required')) {
      return true;
    }

    const cognitoUser = cognitoUtils.getCurrentUser();

    // No user at all: unauthenticated.
    if (!cognitoUser) {
      if (allowedStates.includes('unauthenticated')) {
        return true;
      }
      return router.parseUrl('/login');
    }

    try {
      const session = await cognitoUtils.getSession();

      // No valid session: unauthenticated.
      if (!session) {
        cognitoUser.signOut();
        if (allowedStates.includes('unauthenticated')) {
          return true;
        }
        return router.parseUrl('/login');
      }

      const challengeName = (cognitoUser as unknown as { challengeName?: string }).challengeName;

      if (challengeName === 'NEW_PASSWORD_REQUIRED') {
        if (allowedStates.includes('password-change-required')) {
          return true;
        }
        return router.parseUrl('/change-password');
      }

      // Valid session and no pending challenge.
      if (allowedStates.includes('authenticated')) {
        return true;
      }
      return router.parseUrl('/');

    } catch (error) {
      // Cognito refused the stored refresh token: drop it, or every reload pays
      // the same failed round trip before landing on the login page.
      console.error('Session guard error:', error);
      cognitoUser.signOut();

      if (allowedStates.includes('unauthenticated')) {
        return true;
      }
      return router.parseUrl('/login');
    }
  };
};
