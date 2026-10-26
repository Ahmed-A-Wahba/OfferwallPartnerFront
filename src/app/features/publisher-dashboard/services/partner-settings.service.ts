import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'https://winfloos.runasp.net';

export interface ProfileResponse {
  fullName: string;
  email: string;
  phoneNumber: string | null;
  logoUrl?: string | null;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber: string | null;
}

export interface CompanyResponse {
  legalName: string | null;
  tradingName: string | null;
  iframeOrigin: string | null;
  registrationNumber: string | null;
  countryCode: string;
  registeredAddress: string | null;
  taxResidencyCountry: string;
  taxRegistrationNumber: string | null;
  contactFullName: string | null;
  contactEmail: string | null;
  contactPhoneNumber: string | null;
}

export interface UpdateCompanyRequest {
  legalName: string;
  tradingName: string | null;
  iframeOrigin: string | null;
  registrationNumber: string | null;
  countryCode: string;
  registeredAddress: string | null;
  taxResidencyCountry: string;
  taxRegistrationNumber: string | null;
  contactFullName: string;
  contactEmail: string;
  contactPhoneNumber: string | null;
}

// PayoutMethod enum values (from backend OfferwallApi.Shared.Entities.PayoutMethod)
export type PayoutMethod = 'BankTransfer';
export const PAYOUT_METHOD_OPTIONS: { value: PayoutMethod; label: string }[] = [
  { value: 'BankTransfer', label: 'Bank Transfer' },
];

// AccountType enum values (from backend OfferwallApi.Shared.Entities.AccountType)
export type AccountType = 'Personal' | 'Business';
export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'Personal', label: 'Personal' },
  { value: 'Business', label: 'Business' },
];

export interface PaymentResponse {
  payoutMethod: string;
  transferType: string | null;
  currency: string | null;
  accountName: string | null;
  swiftCode: string | null;
  iban: string | null;
  country: string;
  routingNumber: string | null;
  accountNumber: string | null;
  accountType: string;
  accountHolderName: string | null;
  accountHolderAddress: string | null;
  bankName: string | null;
}

export interface UpdatePaymentRequest {
  payoutMethod: string;
  transferType: string | null;
  currency: string | null;
  accountName: string | null;
  swiftCode: string | null;
  iban: string | null;
  countryCode: string;
  routingNumber: string | null;
  accountNumber: string | null;
  accountType: string;
  accountHolderName: string | null;
  accountHolderAddress: string | null;
  bankName: string | null;
}

@Injectable({ providedIn: 'root' })
export class PartnerSettingsService {
  private http = inject(HttpClient);

  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${API_URL}/partner/settings/profile`);
  }

  updateProfile(formData: FormData): Observable<any> {
    return this.http.put(`${API_URL}/partner/settings/profile`, formData);
  }

  getCompany(): Observable<CompanyResponse> {
    return this.http.get<CompanyResponse>(`${API_URL}/partner/settings/company`);
  }

  updateCompany(data: UpdateCompanyRequest): Observable<any> {
    return this.http.put(`${API_URL}/partner/settings/company`, data);
  }

  getPayment(): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${API_URL}/partner/settings/payment`);
  }

  updatePayment(data: UpdatePaymentRequest): Observable<any> {
    return this.http.put(`${API_URL}/partner/settings/payment`, data);
  }
}
