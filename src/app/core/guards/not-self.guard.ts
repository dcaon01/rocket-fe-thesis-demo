import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CognitoUtilsService } from '../../auth/services/cognito-utils.service';

/**
 * Guard that keeps the logged-in user out of the detail page of their own account.
 * Mirrors the backend, which refuses any update of the requester's own account.
 * The user lands on the parent route, so the guard works in every area that mounts the page.
 * @param paramName the route parameter holding the user sub.
 * @returns canActivate function that compares the route sub with the user sub.
 */
export const notSelfGuard = (paramName: string): CanActivateFn => {
  return (route) => {
    const cognitoUtils = inject(CognitoUtilsService);
    const router = inject(Router);

    const parentUrl = '/' + (route.parent?.pathFromRoot ?? []).flatMap(snapshot => snapshot.url.map(segment => segment.path)).join('/');
    return cognitoUtils.getUserIdentifiers().pipe(
      map(userIdentifiers => userIdentifiers.sub === route.params[paramName] ? router.parseUrl(parentUrl) : true),
      catchError(() => of(router.parseUrl('/login')))
    );
  };
};
