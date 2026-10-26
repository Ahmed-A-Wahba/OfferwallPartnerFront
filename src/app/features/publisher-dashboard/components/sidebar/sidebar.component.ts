import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { PartnerDashboardService } from '../../services/partner-dashboard.service';
import { PartnerAuthService } from '../../../publisher-login/services/partner-auth.service';

@Component({
  selector: 'app-publisher-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class PublisherSidebarComponent implements OnInit, OnDestroy {
  private dashboardService = inject(PartnerDashboardService);
  private authService = inject(PartnerAuthService);
  private router = inject(Router);

  private routerSub!: Subscription;

  currentRoute = '';
  isReportsExpanded = false;

  ngOnInit(): void {
    this.currentRoute = this.router.url;
    this.isReportsExpanded = this.currentRoute.includes('reports');

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.currentRoute = e.urlAfterRedirects;
        if (this.currentRoute.includes('reports')) {
          this.isReportsExpanded = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  toggleReportsMenu(): void {
    this.isReportsExpanded = !this.isReportsExpanded;
  }

  onLogout(): void {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    this.dashboardService.logoutBackend(refreshToken).subscribe({
      next: () => this.authService.logout(),
      error: () => this.authService.logout(),
    });
  }
}
