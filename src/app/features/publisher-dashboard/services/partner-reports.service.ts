import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'https://winfloos.runasp.net';

export interface RedemptionOverviewResponse {
  totalRedeemedUsd: number;
  totalCouponsGenerated: number;
}

export interface RedemptionItem {
  createdAt: string;
  userId: string;
  couponCode: string;
  value: number;
  points: number;
}

export interface RedemptionsResponse {
  items: RedemptionItem[];
  totalCount: number;
}

export interface RedemptionsQueryFilter {
  from?: string;
  to?: string;
  sortBy?: 'Date' | 'Value';
  direction?: 'Asc' | 'Desc';
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class PartnerReportsService {
  private http = inject(HttpClient);

  getOverview(from?: string, to?: string): Observable<RedemptionOverviewResponse> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<RedemptionOverviewResponse>(
      `${API_URL}/partners/reports/overview`,
      { params }
    );
  }

  getRedemptions(filter: RedemptionsQueryFilter): Observable<RedemptionsResponse> {
    let params = new HttpParams();
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.direction) params = params.set('direction', filter.direction);
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());

    return this.http.get<RedemptionsResponse>(
      `${API_URL}/partners/reports/redemptions`,
      { params }
    );
  }
}
