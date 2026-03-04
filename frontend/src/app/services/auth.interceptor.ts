/**
 * auth.interceptor.ts — JWT HTTP interceptor.
 *
 * This interceptor runs automatically on EVERY outgoing HTTP request.
 * Components and services never need to manually attach auth headers —
 * this handles it transparently.
 *
 * What it does:
 *   1. Reads the JWT from AuthService
 *   2. Clones the request and adds the Authorization: Bearer <token> header
 *   3. Passes the modified request to the next handler
 *   4. If the response is 401 (Unauthorized / token expired):
 *      - Calls auth.logout() to clear stored credentials
 *      - Navigates to /login so the user can re-authenticate
 *
 * Why clone the request?
 *   HttpRequest objects are immutable in Angular. To add a header you must
 *   create a new request via req.clone() with the modifications applied.
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const token  = auth.getToken();

  // Only add the header if we actually have a token.
  // Public endpoints (login, register) will proceed without it.
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 means the token is missing, invalid, or expired.
      // Log the user out and send them back to the login page.
      if (err.status === 401) {
        auth.logout();
        router.navigate(['/login']);
      }
      // Re-throw the error so the component's error handler still runs
      return throwError(() => err);
    })
  );
};
