import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import {
  PartnerReportsService,
  RedemptionItem,
  RedemptionOverviewResponse,
} from '../services/partner-reports.service';
import { PartnerDashboardService, OverviewResponse } from '../services/partner-dashboard.service';
import { PartnerAuthService } from '../../publisher-login/services/partner-auth.service';
import { parseBackendError } from '../../publisher-signup/publisher-signup.service';

import { PublisherHeaderComponent } from '../components/header/header.component';
import { PublisherSidebarComponent } from '../components/sidebar/sidebar.component';
import { PublisherFooterComponent } from '../components/footer/footer.component';

@Component({
  selector: 'app-redemptions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, PublisherHeaderComponent, PublisherSidebarComponent, PublisherFooterComponent],
  templateUrl: './redemptions.component.html',
  styleUrl: './redemptions.component.css',
})
export class RedemptionsComponent implements OnInit, OnDestroy {
  private reportsService = inject(PartnerReportsService);
  private dashboardService = inject(PartnerDashboardService);
  private authService = inject(PartnerAuthService);
  private router = inject(Router);

  private routerSubscription!: Subscription;

  // Navigation & Layout
  currentRoute = '';
  isReportsExpanded = true;
  companyInitials = 'NX';
  overviewData: OverviewResponse | null = null;

  // Summary Cards
  reportOverview: RedemptionOverviewResponse | null = null;
  isLoadingOverview = true;

  // Redemptions Table
  items: RedemptionItem[] = [];
  totalCount = 0;
  isLoadingTable = true;
  tableError = '';

  // Export CSV state
  isExporting = false;
  exportError = '';

  // Filters
  fromDate = '';
  toDate = '';
  sortBy: 'Date' | 'Value' = 'Date';
  direction: 'Asc' | 'Desc' = 'Desc';
  filterError = '';

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

    // Fetch profile for avatar
    this.dashboardService.getOverview().subscribe({
      next: (res) => {
        this.overviewData = res;
        this.logoUrl = res.logoUrl || null;
        this.companyInitials = this.getInitials(res.companyName);
      },
      error: () => {},
    });

    this.fetchAll();
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  onImageError(event?: Event): void {
    this.logoUrl = null;
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

  // ── Computed Pagination ──────────────────────────────
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (this.page > 3) pages.push(-1); // ellipsis
    const start = Math.max(2, this.page - 1);
    const end = Math.min(total - 1, this.page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (this.page < total - 2) pages.push(-1); // ellipsis
    pages.push(total);
    return pages;
  }

  get showingStart(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get showingEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  // ── Fetch helpers ────────────────────────────────────
  fetchAll(): void {
    this.fetchOverview();
    this.fetchTable();
  }

  fetchOverview(): void {
    this.isLoadingOverview = true;
    this.reportsService.getOverview(this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: (res) => {
        this.reportOverview = res;
        this.isLoadingOverview = false;
      },
      error: (err) => {
        this.isLoadingOverview = false;
        console.error('Overview fetch failed', err);
      },
    });
  }

  fetchTable(): void {
    this.isLoadingTable = true;
    this.tableError = '';
    this.reportsService
      .getRedemptions({
        from: this.fromDate || undefined,
        to: this.toDate || undefined,
        sortBy: this.sortBy,
        direction: this.direction,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.totalCount = res.totalCount;
          this.isLoadingTable = false;
        },
        error: (err) => {
          const msgs = parseBackendError(err);
          this.tableError = msgs[0] || 'Failed to load redemptions.';
          this.isLoadingTable = false;
        },
      });
  }

  // ── Filter / Sort actions ────────────────────────────
  applyFilters(): void {
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) {
      this.filterError = "'From' date must be less than or equal to 'To' date.";
      return;
    }
    this.filterError = '';
    this.page = 1;
    this.fetchAll();
  }

  toggleDirection(): void {
    this.direction = this.direction === 'Asc' ? 'Desc' : 'Asc';
  }

  // ── Pagination actions ───────────────────────────────
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.fetchTable();
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.fetchTable();
  }

  // ── Export CSV ───────────────────────────────────────
  onExportCsv(): void {
    if (this.isExporting) return;

    if (!this.fromDate || !this.toDate) {
      this.exportError = 'Please select a date range before exporting.';
      setTimeout(() => (this.exportError = ''), 4000);
      return;
    }

    this.isExporting = true;
    this.exportError = '';

    this.dashboardService
      .exportPerformance(this.fromDate, this.toDate)
      .subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute(
            'download',
            `nexus-redemptions-${this.fromDate}-to-${this.toDate}.csv`
          );
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          this.isExporting = false;
        },
        error: () => {
          this.isExporting = false;
          this.exportError = 'Failed to export. Please try again.';
          setTimeout(() => (this.exportError = ''), 4000);
        },
      });
  }

  exportCsv(): void {
    this.onExportCsv();
  }

  // ── Logout ───────────────────────────────────────────
  onLogout(): void {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    this.dashboardService.logoutBackend(refreshToken).subscribe({
      next: () => this.authService.logout(),
      error: () => this.authService.logout(),
    });
  }

  // ── Skeleton rows for loading state ─────────────────
  get skeletonRows(): number[] {
    return Array.from({ length: this.pageSize }, (_, i) => i);
  }
}
