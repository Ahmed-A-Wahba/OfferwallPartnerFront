import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { PartnerAuthService } from '../services/partner-auth.service';

// NOTE: module-level flag — intentionally shared across requests to prevent
// concurrent refresh calls, but must be reset on EVERY code path to avoid leaking.
let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(PartnerAuthService);
  const accessToken = authService.getAccessToken();

  // Don't attach token to login/refresh/register requests
  const isAuthRequest =
    req.url.includes('/partner/auth/login') ||
    req.url.includes('/partner/auth/refresh-token') ||
    req.url.includes('/partners/auth/register') ||
    req.url.includes('/partner/auth/resend-code');

  let authReq = req;
  if (accessToken && !isAuthRequest) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // ── Auth endpoints (login, refresh, register, resend-code) ──────────────
      // Never attempt a token refresh for these — pass the original error straight
      // through so the component's catch handler receives the real backend payload.
      if (isAuthRequest) {
        return throwError(() => error);
      }

      // ── Protected endpoints — attempt token refresh on 401 ──────────────────
      if (error.status === 401 && !isRefreshing) {
        isRefreshing = true;

        return authService.refreshToken().pipe(
          switchMap((response) => {
            isRefreshing = false;

            if (response && response.accessToken) {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.accessToken}`,
                },
              });
              return next(retryReq);
            }

            authService.logout();
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            isRefreshing = false;   // ← always reset, even on refresh failure
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
