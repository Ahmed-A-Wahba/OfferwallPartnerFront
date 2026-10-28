import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = '';

export interface OverviewResponse {
  companyName: string;
  logoUrl: string | null;
  couponsGenerated: number;
  couponsRedeemed: number;
  totalPaid: number;
  totalInThisMonth: number;
  pendingSettlements: number;
  chargebacks: number;
}

export interface ChartPoint {
  date: string; // DateOnly string format YYYY-MM-DD
  count: number;
}

export interface PerformanceOverviewResponse {
  generated: ChartPoint[];
  redeemed: ChartPoint[];
}

export interface OfferPerformanceItem {
  offerId: string;
  offerName: string;
  offerLogoUrl: string;
  clicks: number;
  conversions: number;
  earnings: number;
}

export interface PerformanceByOfferResponse {
  offers: OfferPerformanceItem[];
}

export interface PayoutItem {
  periodStart: string;    // DateOnly "YYYY-MM-DD"
  periodEnd: string;      // DateOnly "YYYY-MM-DD"
  paidAt: string | null;  // DateOnly or null if not paid
  redemptionCount: number;
  amount: number;
  status: 'Pending' | 'Paid' | 'Estimated';
}

export interface PayoutHistoryResponse {
  items: PayoutItem[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class PartnerDashboardService {
  private http = inject(HttpClient);

  getOverview(): Observable<OverviewResponse> {
    return this.http.get<OverviewResponse>(`${API_URL}/partners/dashboard/overview`);
  }

  getPerformanceOverview(from: string, to: string): Observable<PerformanceOverviewResponse> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to);
    return this.http.get<PerformanceOverviewResponse>(
      `${API_URL}/partners/dashboard/performance-overview`,
      { params }
    );
  }

  getPerformanceByOffer(
    from: string,
    to: string,
    sortBy: string = 'Revenue',
    sortDirection: string = 'Descending'
  ): Observable<PerformanceByOfferResponse> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);
    return this.http.get<PerformanceByOfferResponse>(
      `${API_URL}/partners/dashboard/performance-by-offer`,
      { params }
    );
  }

  getPayoutHistory(page: number = 1, pageSize: number = 10): Observable<PayoutHistoryResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PayoutHistoryResponse>(`${API_URL}/partner/payouts/history`, { params });
  }

  logoutBackend(refreshToken: string): Observable<any> {
    return this.http.post(`${API_URL}/partners/logout`, { refreshToken });
  }

  exportPerformance(from: string, to: string): Observable<Blob> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to);
    return this.http.get(
      `${API_URL}/partners/dashboard/performance-overview/export`,
      {
        params,
        responseType: 'blob',
      }
    );
  }
}
