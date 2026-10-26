import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { Chart, ChartConfiguration } from 'chart.js/auto';

import { PartnerDashboardService, OverviewResponse, OfferPerformanceItem } from '../services/partner-dashboard.service';
import { PartnerAuthService } from '../../publisher-login/services/partner-auth.service';

import { PublisherHeaderComponent } from '../components/header/header.component';
import { PublisherSidebarComponent } from '../components/sidebar/sidebar.component';
import { PublisherFooterComponent } from '../components/footer/footer.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PublisherHeaderComponent, PublisherSidebarComponent, PublisherFooterComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(PartnerDashboardService);
  private authService = inject(PartnerAuthService);
  private router = inject(Router);

  // Constants
  readonly API_DOCS_URL = 'https://docs.nexus.io';

  // Quick Actions State
  isExporting = false;
  exportError = '';

  // References and Subscriptions
  @ViewChild('performanceChart') performanceChartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | null = null;
  private routerSubscription!: Subscription;

  // Overview Data
  overview: OverviewResponse | null = null;
  logoUrl: string | null = null;
  isLoadingOverview = true;
  overviewError = '';

  // Performance Chart Data & Filters
  chartFromDate = '';
  chartToDate = '';
  isLoadingChart = false;
  chartError = '';
  chartGeneratedTotal = 0;
  chartRedeemedTotal = 0;

  // Performance by Offer Data & Filters
  tableFromDate = '';
  tableToDate = '';
  tableSortBy = 'Revenue';
  tableSortDirection = 'Descending';
  isLoadingTable = false;
  tableError = '';
  offers: OfferPerformanceItem[] = [];

  // Sidebar & Layout State
  currentRoute = '';
  companyInitials = 'NX';
  isReportsExpanded = true; // Sidebar reports sub-menu state

  ngOnInit(): void {
    this.currentRoute = this.router.url;
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentRoute = event.urlAfterRedirects;
      });

    // Initialize Default Dates
    const today = new Date();
    
    // Chart: Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    this.chartToDate = this.formatDate(today);
    this.chartFromDate = this.formatDate(sevenDaysAgo);

    // Table: Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    this.tableToDate = this.formatDate(today);
    this.tableFromDate = this.formatDate(thirtyDaysAgo);

    // Fetch Initial Data
    this.fetchOverview();
    this.fetchPerformanceOverview();
    this.fetchPerformanceByOffer();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }

  // Helpers
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getInitials(name: string): string {
    if (!name) return 'NX';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  toggleReportsMenu(): void {
    this.isReportsExpanded = !this.isReportsExpanded;
  }

  onImageError(event?: Event): void {
    this.logoUrl = null;
  }

  // API Call: Overview
  fetchOverview(): void {
    this.isLoadingOverview = true;
    this.overviewError = '';
    this.dashboardService.getOverview().subscribe({
      next: (res) => {
        this.overview = res;
        this.logoUrl = res.logoUrl || null;
        this.companyInitials = this.getInitials(res.companyName);
        this.isLoadingOverview = false;
      },
      error: (err) => {
        console.error('Failed to load overview', err);
        this.overviewError = 'Failed to load stats overview.';
        this.isLoadingOverview = false;
      }
    });
  }

  // API Call: Chart Data
  fetchPerformanceOverview(): void {
    this.isLoadingChart = true;
    this.chartError = '';
    this.dashboardService.getPerformanceOverview(this.chartFromDate, this.chartToDate).subscribe({
      next: (res) => {
        this.chartGeneratedTotal = res.generated.reduce((acc, curr) => acc + curr.count, 0);
        this.chartRedeemedTotal = res.redeemed.reduce((acc, curr) => acc + curr.count, 0);
        
        setTimeout(() => {
          this.renderChart(res.generated, res.redeemed);
        }, 0);
        
        this.isLoadingChart = false;
      },
      error: (err) => {
        console.error('Failed to load chart data', err);
        this.chartError = 'Failed to load chart metrics.';
        this.isLoadingChart = false;
      }
    });
  }

  // API Call: Table Data
  fetchPerformanceByOffer(): void {
    this.isLoadingTable = true;
    this.tableError = '';
    this.dashboardService.getPerformanceByOffer(
      this.tableFromDate,
      this.tableToDate,
      this.tableSortBy,
      this.tableSortDirection
    ).subscribe({
      next: (res) => {
        this.offers = res.offers;
        this.isLoadingTable = false;
      },
      error: (err) => {
        console.error('Failed to load offers performance', err);
        this.tableError = 'Failed to load performance data.';
        this.isLoadingTable = false;
      }
    });
  }

  // Apply Date Filters
  applyChartFilters(): void {
    if (this.chartFromDate && this.chartToDate) {
      this.fetchPerformanceOverview();
    }
  }

  applyTableFilters(): void {
    if (this.tableFromDate && this.tableToDate) {
      this.fetchPerformanceByOffer();
    }
  }

  onSortChange(sortBy: string): void {
    if (this.tableSortBy === sortBy) {
      // Toggle sort direction
      this.tableSortDirection = this.tableSortDirection === 'Ascending' ? 'Descending' : 'Ascending';
    } else {
      this.tableSortBy = sortBy;
      this.tableSortDirection = 'Descending';
    }
    this.fetchPerformanceByOffer();
  }

  // Render ChartJS
  private renderChart(generated: { date: string; count: number }[], redeemed: { date: string; count: number }[]): void {
    if (!this.performanceChartCanvas) return;

    // Destroy existing instance to redraw
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // Merge dates from both sets to get complete x-axis
    const allDatesSet = new Set<string>();
    generated.forEach(p => allDatesSet.add(p.date));
    redeemed.forEach(p => allDatesSet.add(p.date));
    const sortedLabels = Array.from(allDatesSet).sort();

    // Map counts to sorted dates
    const generatedData = sortedLabels.map(date => {
      const point = generated.find(p => p.date === date);
      return point ? point.count : 0;
    });

    const redeemedData = sortedLabels.map(date => {
      const point = redeemed.find(p => p.date === date);
      return point ? point.count : 0;
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: sortedLabels.map(d => {
          // Format date string YYYY-MM-DD to cleaner label, e.g., "Jul 21"
          const dateObj = new Date(d);
          return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        }),
        datasets: [
          {
            label: 'Coupons Generated',
            data: generatedData,
            borderColor: '#7C3AED',
            backgroundColor: 'rgba(124, 90, 237, 0.05)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#7C3AED',
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Coupons Redeemed',
            data: redeemedData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#10B981',
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // We will render custom interactive HTML legends
          },
          tooltip: {
            padding: 12,
            cornerRadius: 8,
            backgroundColor: '#1E293B',
            titleFont: { family: 'Inter', size: 12, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 12 },
            displayColors: true
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#64748B'
            }
          },
          y: {
            border: { dash: [4, 4] },
            grid: {
              color: '#F1F5F9'
            },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#64748B',
              precision: 0
            }
          }
        }
      }
    };

    const ctx = this.performanceChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.chartInstance = new Chart(ctx, config);
    }
  }

  // Quick Action 1: Export Performance CSV
  onExportPerformance(): void {
    if (this.isExporting) return;
    this.isExporting = true;
    this.exportError = '';

    const from = this.chartFromDate;
    const to = this.chartToDate;

    if (!from || !to) {
      this.isExporting = false;
      this.exportError = 'Please select a valid date range first.';
      return;
    }

    this.dashboardService.exportPerformance(from, to).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `nexus-performance-${from}-to-${to}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: () => {
        this.isExporting = false;
        this.exportError =
          'Failed to export data. Please try again.';
      }
    });
  }

  // Alias for backward compatibility
  exportToCSV(): void {
    this.onExportPerformance();
  }

  // Quick Action 2: Open API Documentation in new tab
  onOpenApiDocs(): void {
    window.open(this.API_DOCS_URL, '_blank');
  }

  // Alias for backward compatibility
  showApiDocs(): void {
    this.onOpenApiDocs();
  }

  // Quick Action 3: Navigate to API Keys & Webhooks (iFrame Integration page)
  onNavigateToApiKeys(): void {
    this.router.navigate(['/iframe']);
  }

  // Logout Logic
  onLogout(): void {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    
    // Attempt backend logout to clean tokens first
    this.dashboardService.logoutBackend(refreshToken).subscribe({
      next: () => {
        this.authService.logout();
      },
      error: (err) => {
        console.error('Backend logout failed, forcing client logout', err);
        this.authService.logout();
      }
    });
  }
}
