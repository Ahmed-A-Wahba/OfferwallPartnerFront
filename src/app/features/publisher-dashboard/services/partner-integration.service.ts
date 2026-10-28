import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'https://winfloos.runasp.net';

export interface IntegrationResponse {
  publisherId: string;
  apiKey: string;
  apiSecret: string;
  pointsPerUsd: number;
}

export interface UpdatePointsRateRequest {
  pointsPerUsd: number;
}

export interface RegenerateApiKeyResponse {
  apiKey: string;
}

@Injectable({ providedIn: 'root' })
export class PartnerIntegrationService {
  private http = inject(HttpClient);

  /** GET /api/partner/integration — requires JWT (Partner role) */
  getIntegration(): Observable<IntegrationResponse> {
    return this.http.get<IntegrationResponse>(`${API_URL}/api/partner/integration`);
  }

  updatePointsRate(pointsPerUsd: number): Observable<void> {
    return this.http.put<void>(`${API_URL}/partners/integration/points-rate`, {
      pointsPerUsd,
    });
  }

  regenerateApiKey(): Observable<RegenerateApiKeyResponse> {
    return this.http.post<RegenerateApiKeyResponse>(
      `${API_URL}/partners/integration/regenerate-api-key`,
      {}
    );
  }
}
