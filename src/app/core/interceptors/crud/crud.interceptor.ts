import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';
import { ToasterService } from '../../services/toaster/toaster.service';
import { inject } from '@angular/core';
import { businessErrorMessage } from '../../utils/business-error.util';

/**
 * Interceptor for handling CRUD operations and showing notifications.
 * @param req exitinng request.
 * @param next the function to handle the next step in the request pipeline.
 * @returns the processed request or response.
 */
export const crudInterceptor: HttpInterceptorFn = (req, next) => {
  const toasterService = inject(ToasterService);

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse && shouldShowToast(req.method, req.url)) {
          if (isS3Request(req.url)) {
            toasterService.showSuccess('Caricamento file completato con successo.');
          } else {
            toasterService.showStructuredToastMessage(req.method, req.url, true);
          }
        }
      },
      error: (error) => {
        console.error('CRUD Interceptor Error:', error);
        if (shouldShowToast(req.method, req.url)) {
          const reason = businessErrorMessage(error);
          if (isS3Request(req.url)) {
            toasterService.showError('Caricamento file fallito.');
          } else if (reason) {
            toasterService.showError(reason);
          } else {
            toasterService.showStructuredToastMessage(req.method, req.url, false);
          }
        }
      }
    })
  );
};

/**
 * Checks whether the request URL points to S3.
 * @param url the request URL.
 * @returns true if the URL is an S3 presigned URL.
 */
function isS3Request(url: string): boolean {
  return url.includes('.s3.') || url.includes('//s3.');
}

/**
 * Checks whether the request is a write that deserves a toast.
 * A list search is a POST that only reads: the list reports its own failures.
 * @param method the HTTP method used in the request.
 * @param url the request URL.
 * @return true if a toast should be shown, false otherwise.
 */
function shouldShowToast(method: string, url: string): boolean {
  if (url.split('?')[0].endsWith('/search')) {
    return false;
  }
  return method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH';
}