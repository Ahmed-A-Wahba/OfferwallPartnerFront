import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

const API_URL = 'https://winfloos.runasp.net';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class PartnerAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_URL}/partner/auth/login`, {
        email,
        password,
      })
      .pipe(
        tap((response) => {
          if (response && response.accessToken) {
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
          }
        })
      );
  }

  resendVerificationCode(email: string | null | undefined): Observable<void> {
    return this.http.post<void>(`${API_URL}/partner/auth/resend-code`, { email });
  }

  forgotPassword(email: string | null | undefined): Observable<void> {
    return this.http.post<void>(`${API_URL}/partner/auth/forgot-password/send-code`, { email });
  }

  resetPassword(payload: { email: string; code: string; newPassword: string | null | undefined }): Observable<void> {
    return this.http.post<void>(`${API_URL}/partner/auth/forgot-password/reset`, payload);
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem('refreshToken') || '';

    return this.http
      .post<LoginResponse>(`${API_URL}/partner/auth/refresh-token`, {
        refreshToken,
      })
      .pipe(
        tap((response) => {
          if (response && response.accessToken) {
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
          }
        })
      );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('partnerId');
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}

/**
 * Extracts a descriptive, user-facing error message from an HttpErrorResponse
 * returned by POST /partner/auth/login (Result<T> / ToHttpResponse pattern).
 *
 * Matching strategy:
 *   1. Log the raw error to the console for diagnosis.
 *   2. Read `code` and `description` as INDEPENDENT fields from BOTH
 *      err.error.* and the double-nested err.error.error.* (ASP.NET Core
 *      Result<T> / ToHttpResponse can wrap the domain error one level deeper).
 *   3. Match known codes with includes() so partial values still fire.
 *   4. Display description directly when no known pattern matches.
 *   5. Fall back to HTTP status codes last.
 */
export function parseLoginError(err: HttpErrorResponse | any): string {
  // ── Debug: always log the raw error so the exact payload is visible in DevTools ──
  console.log('RAW BACKEND ERROR RESPONSE:', err);
  console.log('err.error:', err?.error);
  console.log('err.error?.error:', err?.error?.error);

  if (!err) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Network / CORS / offline — status 0
  if (err.status === 0) {
    return 'Network error. Please check your internet connection.';
  }

  // Extract the innermost error object (handle JSON-string body as well)
  let errorData: any = err.error;
  if (typeof errorData === 'string') {
    try { errorData = JSON.parse(errorData); } catch { /* keep as-is */ }
  }

  if (errorData && typeof errorData === 'object') {
    // ASP.NET Core's ToHttpResponse() on a failed Result<T> can produce two shapes:
    //   Shape A (flat):   { code: "AccountPendingApproval", description: "..." }
    //   Shape B (nested): { error: { code: "AccountPendingApproval", description: "..." } }
    // Read from both layers so neither shape is missed.
    const inner: any = errorData.error ?? {};

    const code: string =
      (errorData.code ?? inner.code ?? errorData.type ?? inner.type ?? '').toString();

    const description: string = (
      errorData.description ??
      errorData.detail      ??
      errorData.message     ??
      inner.description     ??
      inner.detail          ??
      inner.message         ??
      ''
    ).toString();

    console.log('Parsed code:', code, '| Parsed description:', description);

    // ── AccountPendingApproval ────────────────────────────────────────────────
    if (
      code.includes('AccountPendingApproval') ||
      code.includes('PendingApproval') ||
      description.toLowerCase().includes('pending approval') ||
      description.toLowerCase().includes('pending admin')
    ) {
      return 'Your publisher account is currently pending admin approval. You will be notified once activated.';
    }

    // ── EmailNotVerified ──────────────────────────────────────────────────────
    if (
      code.includes('EmailNotVerified') ||
      description.toLowerCase().includes('not verified') ||
      description.toLowerCase().includes('verify your email') ||
      description.toLowerCase().includes('email verification')
    ) {
      return 'Your email address is not verified yet. Please check your inbox for the verification link.';
    }

    // ── InvalidCredentials ────────────────────────────────────────────────────
    if (code.includes('InvalidCredentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }

    // ── Unknown — display whatever human-readable text the backend provided ───
    if (description) {
      return description;
    }
  }

  // Status-code fallbacks (only reached when the response body carries no usable text)
  switch (err.status) {
    case 400:
    case 401:
      return 'Invalid email or password. Please try again.';
    default:
      return err.message || 'Login failed. Please try again.';
  }
}

