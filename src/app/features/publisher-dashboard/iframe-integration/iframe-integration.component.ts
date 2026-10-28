import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, filter } from 'rxjs';

import {
  PartnerIntegrationService,
  IntegrationResponse,
} from '../services/partner-integration.service';
import {
  PartnerDashboardService,
  OverviewResponse,
} from '../services/partner-dashboard.service';
import { PartnerAuthService } from '../../publisher-login/services/partner-auth.service';
import { parseBackendError } from '../../publisher-signup/publisher-signup.service';

function integerValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined || control.value === '') {
    return null;
  }
  const val = Number(control.value);
  return Number.isInteger(val) ? null : { notInteger: true };
}

import { PublisherHeaderComponent } from '../components/header/header.component';
import { PublisherSidebarComponent } from '../components/sidebar/sidebar.component';
import { PublisherFooterComponent } from '../components/footer/footer.component';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Component({
  selector: 'app-iframe-integration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, PublisherHeaderComponent, PublisherSidebarComponent, PublisherFooterComponent],
  templateUrl: './iframe-integration.component.html',
  styleUrl: './iframe-integration.component.css',
})
export class IframeIntegrationComponent implements OnInit, OnDestroy {
  private integrationService = inject(PartnerIntegrationService);
  private dashboardService = inject(PartnerDashboardService);
  private authService = inject(PartnerAuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  private routerSubscription!: Subscription;

  // Integration & Profile Data
  integrationData: IntegrationResponse | null = null;
  overviewData: OverviewResponse | null = null;
  isLoading = true;
  errorMessage = '';
  companyInitials = 'NX';

  // Navigation & Layout
  currentRoute = '';
  isReportsExpanded = false;

  // Onboarding Progress Checklist
  step1Complete = false;
  step2Complete = false;
  keyCopiedAtLeastOnce = false;

  // API Secret visibility toggle
  showApiSecret = false;

  get completedSteps(): number {
    return (this.step1Complete ? 1 : 0) + (this.step2Complete ? 1 : 0);
  }

  get completedStepsCount(): number {
    return this.completedSteps;
  }

  // Regenerate API Key Modal State
  showRegenerateModal = false;
  isRegeneratingKey = false;

  // Points Rate Form
  pointsForm = new FormGroup({
    pointsPerUsd: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(100000),
      integerValidator,
    ]),
  });
  isSavingRate = false;
  saveRateError = '';

  // Live Preview State
  testUserId = 'user_123';
  previewUserId = 'user_123';

  // Toast Notifications System
  toasts: ToastMessage[] = [];
  private toastIdCounter = 0;

  ngOnInit(): void {
    this.step1Complete = localStorage.getItem('nexus_iframe_step1_complete') === 'true';
    this.step2Complete = localStorage.getItem('nexus_iframe_step2_complete') === 'true';

    this.currentRoute = this.router.url;
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentRoute = event.urlAfterRedirects;
      });

    this.fetchData();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // Layout Data
  logoUrl: string | null = null;

  onImageError(event?: Event): void {
    this.logoUrl = null;
  }

  // Fetch Data from Backend
  fetchData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Fetch Overview for User Avatar & Company Name
    this.dashboardService.getOverview().subscribe({
      next: (res) => {
        this.overviewData = res;
        this.logoUrl = res.logoUrl || null;
        this.companyInitials = this.getInitials(res.companyName);
      },
      error: (err) => {
        console.error('Failed to load overview data', err);
      },
    });

    // Fetch Integration Data (publisherId, apiKey, pointsPerUsd)
    this.integrationService.getIntegration().subscribe({
      next: (res) => {
        this.integrationData = res;
        this.pointsForm.patchValue({ pointsPerUsd: res.pointsPerUsd });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch integration data', err);
        const parsed = parseBackendError(err);
        this.errorMessage = parsed[0] || 'Failed to load integration settings.';
        this.isLoading = false;
      },
    });
  }

  // Helpers
  getInitials(name: string): string {
    if (!name) return 'NX';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  toggleReportsMenu(): void {
    this.isReportsExpanded = !this.isReportsExpanded;
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const id = ++this.toastIdCounter;
    this.toasts.push({ id, message, type });
    setTimeout(() => {
      this.removeToast(id);
    }, 3500);
  }

  removeToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  // Offer Wall URL & Embed Code Generators
  get offerWallUrl(): string {
    const pubId = this.integrationData?.partnerId || 'PUBLISHER_ID';
    return `https://offerwall.nexus.com/wall?pub_id=${pubId}&user_id=USER_ID`;
  }

  get embedCodeSnippet(): string {
    const pubId = this.integrationData?.partnerId || 'PUBLISHER_ID';
    return `<iframe\n  src="https://offerwall.nexus.com/wall?pub_id=${pubId}&user_id=USER_ID"\n  width="100%"\n  height="800"\n  frameborder="0">\n</iframe>`;
  }

  get previewIframeUrl(): SafeResourceUrl {
    const pubId = this.integrationData?.partnerId || 'PUBLISHER_ID';
    const rawUrl = `https://offerwall.nexus.com/wall?pub_id=${pubId}&user_id=${encodeURIComponent(
      this.previewUserId
    )}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
  }

  // Copy Actions
  onCopyKey(): void {
    this.copyApiKey();
  }

  copyApiKey(): void {
    if (!this.integrationData?.apiKey) return;
    navigator.clipboard.writeText(this.integrationData.apiKey).then(() => {
      this.keyCopiedAtLeastOnce = true;
      this.step1Complete = true;
      localStorage.setItem('nexus_iframe_step1_complete', 'true');
      this.showToast('API Key copied to clipboard', 'success');
    });
  }

  copyApiSecret(): void {
    if (!this.integrationData?.apiSecret) return;
    navigator.clipboard.writeText(this.integrationData.apiSecret).then(() => {
      this.showToast('API Secret copied to clipboard — keep it secure!', 'success');
    });
  }

  toggleApiSecretVisibility(): void {
    this.showApiSecret = !this.showApiSecret;
  }

  copyOfferWallUrl(): void {
    navigator.clipboard.writeText(this.offerWallUrl).then(() => {
      this.showToast('Offer Wall URL copied to clipboard', 'success');
    });
  }

  copyEmbedCode(): void {
    navigator.clipboard.writeText(this.embedCodeSnippet).then(() => {
      this.showToast('Embed code snippet copied to clipboard', 'success');
    });
  }

  // Step 2 Action
  onOpenPreview(): void {
    this.scrollToPreview();
  }

  scrollToPreview(): void {
    this.step2Complete = true;
    localStorage.setItem('nexus_iframe_step2_complete', 'true');
    const el = document.getElementById('live-preview-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Regenerate Key Dialog Actions
  openRegenerateModal(): void {
    this.showRegenerateModal = true;
  }

  closeRegenerateModal(): void {
    this.showRegenerateModal = false;
  }

  confirmRegenerateApiKey(): void {
    this.isRegeneratingKey = true;
    this.integrationService.regenerateApiKey().subscribe({
      next: (res) => {
        if (this.integrationData) {
          this.integrationData.apiKey = res.apiKey;
        }
        this.isRegeneratingKey = false;
        this.closeRegenerateModal();
        this.showToast('API key regenerated successfully', 'success');
      },
      error: (err) => {
        this.isRegeneratingKey = false;
        const parsed = parseBackendError(err);
        this.showToast(parsed[0] || 'Failed to regenerate API key', 'error');
      },
    });
  }

  // Points Rate Save Action
  onSavePointsRate(): void {
    if (this.pointsForm.invalid) {
      this.pointsForm.markAllAsTouched();
      return;
    }

    const newRate = this.pointsForm.value.pointsPerUsd;
    if (!newRate) return;

    this.isSavingRate = true;
    this.saveRateError = '';

    this.integrationService.updatePointsRate(newRate).subscribe({
      next: () => {
        if (this.integrationData) {
          this.integrationData.pointsPerUsd = newRate;
        }
        this.isSavingRate = false;
        this.showToast('Points rate updated successfully', 'success');
      },
      error: (err) => {
        this.isSavingRate = false;
        const parsed = parseBackendError(err);
        this.saveRateError = parsed[0] || 'Failed to update points rate.';
        this.showToast(this.saveRateError, 'error');
      },
    });
  }

  // Update Live Preview User ID
  updatePreview(): void {
    const cleaned = this.testUserId.trim();
    if (!cleaned) {
      this.showToast('Please enter a valid test User ID', 'error');
      return;
    }
    this.previewUserId = cleaned;
    this.step2Complete = true;
    localStorage.setItem('nexus_iframe_step2_complete', 'true');
    this.showToast(`Preview updated for user: ${cleaned}`, 'info');
  }

  openPreviewInNewTab(): void {
    const pubId = this.integrationData?.partnerId || 'PUBLISHER_ID';
    const url = `https://offerwall.nexus.com/wall?pub_id=${pubId}&user_id=${encodeURIComponent(
      this.previewUserId
    )}`;
    window.open(url, '_blank');
  }

  // Logout Action
  onLogout(): void {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    this.dashboardService.logoutBackend(refreshToken).subscribe({
      next: () => {
        this.authService.logout();
      },
      error: (err) => {
        console.error('Backend logout failed, forcing client logout', err);
        this.authService.logout();
      },
    });
  }
}
