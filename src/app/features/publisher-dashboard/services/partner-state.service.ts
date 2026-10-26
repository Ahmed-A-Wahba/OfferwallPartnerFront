import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PartnerDashboardService, OverviewResponse } from './partner-dashboard.service';

@Injectable({ providedIn: 'root' })
export class PartnerStateService {
  private dashboardService = inject(PartnerDashboardService);

  private overviewSubject = new BehaviorSubject<OverviewResponse | null>(null);
  public overview$: Observable<OverviewResponse | null> = this.overviewSubject.asObservable();

  private isLoaded = false;

  get overview(): OverviewResponse | null {
    return this.overviewSubject.value;
  }

  loadOverview(force: boolean = false): Observable<OverviewResponse | null> {
    if (!this.isLoaded || force) {
      this.dashboardService.getOverview().subscribe({
        next: (res) => {
          this.isLoaded = true;
          this.overviewSubject.next(res);
        },
        error: (err) => {
          console.error('Failed to load shared publisher overview:', err);
        },
      });
    }
    return this.overview$;
  }

  updateOverview(partial: Partial<OverviewResponse>): void {
    const current = this.overviewSubject.value;
    if (current) {
      this.overviewSubject.next({ ...current, ...partial });
    } else {
      this.overviewSubject.next({
        companyName: partial.companyName || 'Publisher',
        logoUrl: partial.logoUrl || null,
        couponsGenerated: partial.couponsGenerated || 0,
        couponsRedeemed: partial.couponsRedeemed || 0,
        totalPaid: partial.totalPaid || 0,
        totalInThisMonth: partial.totalInThisMonth || 0,
        pendingSettlements: partial.pendingSettlements || 0,
        chargebacks: partial.chargebacks || 0,
      });
    }
  }

  updateLogo(logoUrl: string | null): void {
    this.updateOverview({ logoUrl });
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return 'NX';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
