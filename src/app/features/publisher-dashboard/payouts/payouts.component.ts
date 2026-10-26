import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import {
  PartnerDashboardService,
  OverviewResponse,
  PayoutItem,
} from '../services/partner-dashboard.service';
import { PartnerAuthService } from '../../publisher-login/services/partner-auth.service';
import { parseBackendError } from '../../publisher-signup/publisher-signup.service';

import { PublisherHeaderComponent } from '../components/header/header.component';
import { PublisherSidebarComponent } from '../components/sidebar/sidebar.component';
import { PublisherFooterComponent } from '../components/footer/footer.component';

@Component({
  selector: 'app-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, PublisherHeaderComponent, PublisherSidebarComponent, PublisherFooterComponent],
  templateUrl: './payouts.component.html',
  styleUrl: './payouts.component.css',
})
export class PayoutsComponent implements OnInit, OnDestroy {
  private dashboardService = inject(PartnerDashboardService);
  private authService = inject(PartnerAuthService);
  private router = inject(Router);

  private routerSubscription!: Subscription;

  // Navigation & Layout
  currentRoute = '';
  isReportsExpanded = false;
  companyInitials = 'NX';
  publisherIdShort = '8492';
  overviewData: OverviewResponse | null = null;

  // Payout Data
  items: PayoutItem[] = [];
  currentPeriod: PayoutItem | null = null;
  totalCount = 0;
  isLoading = true;
  errorMessage = '';

  // ── Calendar Net-30 computed period (client UTC, used as fallback) ──
  periodStart!: Date;
  periodEnd!: Date;
  payoutDate!: Date;
  daysRemaining!: number;
  periodProgress!: number;

  // Pagination
  page = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50, 100];

  // Avatar Data
  logoUrl: string | null = null;

  ngOnInit(): void {
    this.currentRoute = this.router.url;
    this.routerSubscription = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => (this.currentRoute = e.urlAfterRedirects));

    // Fetch profile overview for header
    this.dashboardService.getOverview().subscribe({
      next: (res) => {
        this.overviewData = res;
        this.logoUrl = res.logoUrl || null;
        this.companyInitials = this.getInitials(res.companyName);
      },
      error: () => {},
    });

    this.calculateNet30Period();
    this.fetchPayoutHistory();
  }

  onImageError(event?: Event): void {
    this.logoUrl = null;
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  getInitials(name: string): string {
    if (!name) return 'NX';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  toggleReportsMenu(): void {
    this.isReportsExpanded = !this.isReportsExpanded;
  }

  fetchPayoutHistory(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardService.getPayoutHistory(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.items = res.items || [];
        this.totalCount = res.totalCount || 0;
        this.currentPeriod = this.items.length > 0 ? this.items[0] : null;
        this.isLoading = false;
      },
      error: (err) => {
        const msgs = parseBackendError(err);
        this.errorMessage = msgs[0] || 'Failed to load payout history.';
        this.isLoading = false;
      },
    });
  }

  // ── Calculation Helpers ──────────────────────────────
  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '–';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  }

  getDaysRemaining(periodEndStr: string | null | undefined): number {
    if (!periodEndStr) return 0;
    const parts = periodEndStr.split('-');
    let end: Date;
    if (parts.length === 3) {
      end = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
        23,
        59,
        59
      );
    } else {
      end = new Date(periodEndStr);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  getPeriodProgress(
    periodStartStr: string | null | undefined,
    periodEndStr: string | null | undefined
  ): number {
    if (!periodStartStr || !periodEndStr) return 0;
    const startParts = periodStartStr.split('-');
    const endParts = periodEndStr.split('-');

    let start: Date;
    let end: Date;

    if (startParts.length === 3) {
      start = new Date(
        parseInt(startParts[0], 10),
        parseInt(startParts[1], 10) - 1,
        parseInt(startParts[2], 10)
      );
    } else {
      start = new Date(periodStartStr);
    }

    if (endParts.length === 3) {
      end = new Date(
        parseInt(endParts[0], 10),
        parseInt(endParts[1], 10) - 1,
        parseInt(endParts[2], 10),
        23,
        59,
        59
      );
    } else {
      end = new Date(periodEndStr);
    }

    const now = new Date();
    if (now.getTime() <= start.getTime()) return 0;
    if (now.getTime() >= end.getTime()) return 100;

    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  getPayoutDate(periodEndStr: string | null | undefined): string {
    if (!periodEndStr) return '–';
    const parts = periodEndStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      date.setDate(date.getDate() + 30);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const d = new Date(periodEndStr);
    if (isNaN(d.getTime())) return '–';
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private calculateNet30Period(): void {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    // 1. Period Start: 1st day of current UTC month
    this.periodStart = new Date(Date.UTC(year, month, 1));

    // 2. Period End: Last day of current UTC month
    this.periodEnd = new Date(Date.UTC(year, month + 1, 0));

    // 3. Payout Date (Net-30): Last day of next UTC month
    this.payoutDate = new Date(Date.UTC(year, month + 2, 0));

    // 4. Days calculations
    const totalDaysInMonth = this.periodEnd.getUTCDate();
    const currentDay = now.getUTCDate();

    this.daysRemaining = Math.max(0, totalDaysInMonth - currentDay);
    this.periodProgress = Math.min(100, Math.round((currentDay / totalDaysInMonth) * 100));
  }

  // ── Pagination ──────────────────────────────────────
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (this.page > 3) pages.push(-1);
    const start = Math.max(2, this.page - 1);
    const end = Math.min(total - 1, this.page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (this.page < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  get showingStart(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get showingEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.fetchPayoutHistory();
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.fetchPayoutHistory();
  }

  // ── CSV Export ──────────────────────────────────────
  exportCSV(): void {
    if (!this.items || this.items.length === 0) return;
    const headers = ['Cycle Period', 'Payout Date', 'Redemptions', 'Amount', 'Status'];
    const rows = this.items.map((item) => [
      `"${this.formatDate(item.periodStart)} – ${this.formatDate(item.periodEnd)}"`,
      `"${item.paidAt ? this.formatDate(item.paidAt) : '-'}"`,
      item.redemptionCount,
      `"$${item.amount.toFixed(2)}"`,
      `"${item.status}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `payout_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onLogout(): void {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    this.dashboardService.logoutBackend(refreshToken).subscribe({
      next: () => this.authService.logout(),
      error: () => this.authService.logout(),
    });
  }
}
