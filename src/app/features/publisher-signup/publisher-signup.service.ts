import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

const API_URL = 'https://winfloos.runasp.net';

export interface SignupData {
  fullName: string;
  email: string;
  companyName: string;
  password: string;
  websiteUrl: string;
  countryCode: string;
  monthlyActiveUsers: number;
  storeCategory: string;
  allowedIframeOrigin: string | null;
}

export const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'BE', label: 'Belgium' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AT', label: 'Austria' },
  { value: 'IE', label: 'Ireland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'GR', label: 'Greece' },
  { value: 'PL', label: 'Poland' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'HU', label: 'Hungary' },
  { value: 'SK', label: 'Slovakia' },
  { value: 'SI', label: 'Slovenia' },
  { value: 'HR', label: 'Croatia' },
  { value: 'RO', label: 'Romania' },
  { value: 'BG', label: 'Bulgaria' },
  { value: 'TR', label: 'Turkey' },
  { value: 'RU', label: 'Russia' },
  { value: 'CN', label: 'China' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'CO', label: 'Colombia' },
  { value: 'PE', label: 'Peru' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'EG', label: 'Egypt' },
  { value: 'KE', label: 'Kenya' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'UG', label: 'Uganda' },
  { value: 'GH', label: 'Ghana' },
  { value: 'SN', label: 'Senegal' },
  { value: 'CI', label: 'Côte d\'Ivoire' },
  { value: 'MA', label: 'Morocco' },
  { value: 'DZ', label: 'Algeria' },
  { value: 'TN', label: 'Tunisia' },
  { value: 'LY', label: 'Libya' },
  { value: 'SD', label: 'Sudan' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'ZW', label: 'Zimbabwe' },
  { value: 'MZ', label: 'Mozambique' },
  { value: 'ZM', label: 'Zambia' },
  { value: 'MW', label: 'Malawi' },
  { value: 'BW', label: 'Botswana' },
  { value: 'NA', label: 'Namibia' },
  { value: 'LS', label: 'Lesotho' },
  { value: 'SZ', label: 'Eswatini' },
  { value: 'Other', label: 'Other' },
];

export const STORE_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'Gaming', label: 'Gaming' },
  { value: 'ECommerce', label: 'E-Commerce' },
  { value: 'Education', label: 'Education' },
  { value: 'Health', label: 'Health' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Other', label: 'Other' },
];

@Injectable({ providedIn: 'root' })
export class PublisherSignupService {
  private http = inject(HttpClient);

  signupError: string | null = null;

  setSignupError(error: string): void {
    this.signupError = error;
  }

  clearSignupError(): void {
    this.signupError = null;
  }

  step1Data: {
    fullName: string;
    email: string;
    companyName: string;
    password: string;
    confirmPassword?: string;
  } | null = null;

  step2Data: {
    websiteUrl: string;
    countryCode: string;
    monthlyActiveUsers: number | null;
    storeCategory: string;
  } | null = null;

  step3Data: {
    allowedIframeOrigin: string;
  } | null = null;

  saveStep1Data(data: Partial<SignupData> | Record<string, unknown>): void {
    this.step1Data = data as Pick<SignupData, 'fullName' | 'email' | 'companyName' | 'password'>;
    this.updateStep1Data(data as Pick<SignupData, 'fullName' | 'email' | 'companyName' | 'password'>);
  }

  saveStep2Data(data: Partial<SignupData> | Record<string, unknown>): void {
    this.step2Data = data as Pick<SignupData, 'websiteUrl' | 'countryCode' | 'monthlyActiveUsers' | 'storeCategory'>;
    this.updateStep2Data(data as Pick<SignupData, 'websiteUrl' | 'countryCode' | 'monthlyActiveUsers' | 'storeCategory'>);
  }

  saveStep3Data(data: { allowedIframeOrigin?: string | null } | Record<string, unknown>): void {
    this.step3Data = data as { allowedIframeOrigin: string };
    const origin = (data as { allowedIframeOrigin?: string | null })?.allowedIframeOrigin?.trim() || null;
    this.signupData.next({ ...this.currentData, allowedIframeOrigin: origin });
  }

  private signupData = new BehaviorSubject<SignupData>({
    fullName: '',
    email: '',
    companyName: '',
    password: '',
    websiteUrl: '',
    countryCode: '',
    monthlyActiveUsers: 0,
    storeCategory: '',
    allowedIframeOrigin: null,
  });

  signupData$ = this.signupData.asObservable();

  get currentData(): SignupData {
    return this.signupData.getValue();
  }

  updateStep1Data(data: Pick<SignupData, 'fullName' | 'email' | 'companyName' | 'password'>): void {
    this.signupData.next({ ...this.currentData, ...data });
  }

  updateStep2Data(data: Pick<SignupData, 'websiteUrl' | 'countryCode' | 'monthlyActiveUsers' | 'storeCategory'>): void {
    this.signupData.next({ ...this.currentData, ...data });
  }

  register(allowedIframeOrigin: string | null): Observable<any> {
    const current = this.currentData;

    return this.http.post(`${API_URL}/partners/auth/register`, {
      fullName: current.fullName,
      email: current.email,
      companyName: current.companyName,
      password: current.password,
      websiteUrl: current.websiteUrl,
      countryCode: current.countryCode,
      monthlyActiveUsers: current.monthlyActiveUsers,
      storeCategory: current.storeCategory,
      allowedIframeOrigin,
    });
  }

  resendCode(email: string): Observable<any> {
    return this.http.post(`${API_URL}/partner/auth/resend-code`, { email });
  }

  verifyOtp(email: string, code: string): Observable<any> {
    return this.http.post(`${API_URL}/partner/auth/verify-email`, { email, code });
  }
}

export function parseBackendError(err: any): string[] {
  if (!err) {
    return ['An unexpected error occurred. Please try again.'];
  }

  if (typeof err.error === 'string') {
    try {
      return parseBackendError({
        ...err,
        error: JSON.parse(err.error)
      });
    } catch {
      return [err.error];
    }
  }

  if (err.error && typeof err.error === 'object') {
    const errorData = err.error;

    // ASP.NET Core ProblemDetails Validation Errors
    const validationErrors =
      errorData.errors ??
      errorData.extensions?.errors;

    if (validationErrors) {
      const messages: string[] = [];

      for (const key of Object.keys(validationErrors)) {
        const value = validationErrors[key];

        if (Array.isArray(value)) {
          messages.push(...value);
        } else if (typeof value === 'string') {
          messages.push(value);
        }
      }

      if (messages.length > 0) {
        return messages;
      }
    }

    // ProblemDetails detail
    if (errorData.detail) {
      return [errorData.detail];
    }

    // Generic message
    if (errorData.message) {
      return [errorData.message];
    }

    // Generic title
    if (errorData.title) {
      return [errorData.title];
    }
  }

  switch (err.status) {
    case 400:
      return ['Bad request.'];
    case 401:
      return ['Unauthorized.'];
    case 403:
      return ['Forbidden.'];
    case 404:
      return ['Not found.'];
    case 409:
      return ['Conflict.'];
    case 500:
      return ['Internal server error.'];
    case 0:
      return ['Cannot connect to the server.'];
    default:
      return [err.message || 'An unexpected error occurred.'];
  }
}
