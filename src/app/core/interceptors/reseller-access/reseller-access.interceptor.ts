import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ResellerAccessService } from '../../services/reseller-access/reseller-access.service';

/** Code of the refusal the server gives to the users of a blocked reseller. */
const RESELLER_ACCESS_BLOCKED = 'RESELLER_ACCESS_BLOCKED';

/** Paths of the requests that read the access themselves: a refusal of theirs never starts another read. */
const ACCESS_READ_PATHS = [/\/reseller-contracts\/reseller\/[^/]+\/access$/, /\/resellers\/code\/[^/]+$/];

/**
 * Interceptor that reads the access of the reseller again as soon as the server refuses a request because the
 * reseller is blocked, so the next navigation lands on the blocking screen without waiting for the access to age.
 * @param req the outgoing request.
 * @param next the function to handle the next step in the request pipeline.
 * @returns the processed request or response.
 */
export const resellerAccessInterceptor: HttpInterceptorFn = (req, next) => {
  const resellerAccess = inject(ResellerAccessService);

  return next(req).pipe(
    tap({
      error: (error) => {
        if (isBlockedRefusal(error) && !ACCESS_READ_PATHS.some(path => path.test(req.url.split('?')[0]))) {
          resellerAccess.load();
        }
      }
    })
  );
};

/**
 * Tells whether an error is the refusal of a blocked reseller.
 * @param error the error of the request.
 * @returns true for a 403 carrying the code of the block.
 */
function isBlockedRefusal(error: unknown): boolean {
  return error instanceof HttpErrorResponse
    && error.status === 403
    && error.error?.details?.code === RESELLER_ACCESS_BLOCKED;
}
