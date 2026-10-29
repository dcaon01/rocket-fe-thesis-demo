import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { CognitoUtilsService } from '../../../auth/services/cognito-utils.service';

/**
 * HTTP interceptor that attaches the Cognito JWT token to outgoing requests.
 * Retrieves the current session and adds the Authorization header with Bearer token.
 * If no valid session exists, the request is passed through without modification.
 * @param req the outgoing HTTP request.
 * @param next the next interceptor in the chain or the backend if no interceptors remain.
 * @returns Observable of the HTTP event stream with Authorization header attached.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Don't add auth header to S3 presigned URL requests
  if (req.url.includes('.s3.') || req.url.includes('s3.amazonaws.com')) {
    return next(req);
  }
  
  const cognitoUtilsService = inject(CognitoUtilsService);

  return from(cognitoUtilsService.getSession()).pipe(
    switchMap((session) => {
      if (session) {
        const token = session.getIdToken().getJwtToken();
        const clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        return next(clonedReq);
      }
      return next(req);
    })
  );
};
