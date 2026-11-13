import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CognitoUtilsService } from '../../auth/services/cognito-utils.service';
import { Profile } from '../enums/profile.enum';

/**
 * Guard that manages route access based on the user's profile.
 * Replaces the old group guard: the four functional groups became the seven
 * profiles of the permission matrix.
 *
 * Mirrors the backend RolesGuard, which is what actually enforces the rule:
 * this one only avoids showing a page the server would refuse.
 * @param allowedProfiles the profiles allowed on the route.
 * @returns canActivate function that checks the user against the allowed profiles.
 */
export const profileGuard = (allowedProfiles: Profile[]): CanActivateFn => {
  return () => {
    const cognitoUtils = inject(CognitoUtilsService);
    const router = inject(Router);

    return cognitoUtils.getUserIdentifiers().pipe(
      map((userIdentifiers) => {
        const groups = userIdentifiers.groups ?? [];
        const allowed = allowedProfiles.some(profile => groups.includes(profile as string));

        if (allowed) {
          return true;
        }

        // Landing on the dashboard would look like the page does not exist:
        // say that access was denied instead.
        console.warn('Access denied: the user holds none of', allowedProfiles);
        return router.parseUrl('/access-denied');
      }),
      catchError((error) => {
        console.error('Error checking user profiles:', error);
        return of(router.parseUrl('/login'));
      })
    );
  };
};
