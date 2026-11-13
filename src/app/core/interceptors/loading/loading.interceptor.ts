import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { LoadingService } from '../../services/loading/loading.service';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

/** Marks a request whose page shows its own placeholders, so the overlay does not cover it. */
export const SKIP_LOADING_OVERLAY = new HttpContextToken<boolean>(() => false);

/**
 * HTTP interceptor that shows a loading indicator during HTTP requests.
 * Automatically sets loading state to true when a request starts and false when it completes.
 * @param req the outgoing HTTP request.
 * @param next the next interceptor in the chain or the backend if no interceptors remain.
 * @returns Observable of the HTTP event stream with loading state management.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  /** Loading service instance. */
  const loadingService = inject(LoadingService);

  if (req.context.get(SKIP_LOADING_OVERLAY)) {
    return next(req);
  }

  /** Set loading state to true before the request is handled. */
  loadingService.setLoading(true);

  return next(req).pipe(
    finalize(() => {
      loadingService.setLoading(false);
    })
  );
};
