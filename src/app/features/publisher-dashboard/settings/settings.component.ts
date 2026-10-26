import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

function iframeOriginValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string)?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return null;
  } catch {
    const lowerVal = value.toLowerCase();
    if (lowerVal === 'localhost' || lowerVal.startsWith('localhost:')) return null;
  }
  return { invalidOrigin: true };
}

import {
  PartnerSettingsService,
  ProfileResponse,
  CompanyResponse,
  UpdateCompanyRequest,
  PaymentResponse,
  UpdatePaymentRequest,
  PAYOUT_METHOD_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from '../services/partner-settings.service';
import {
  PartnerDashboardService,
  OverviewResponse,
} from '../services/partner-dashboard.service';
import { PartnerAuthService } from '../../publisher-login/services/partner-auth.service';
import { COUNTRY_OPTIONS, parseBackendError } from '../../publisher-signup/publisher-signup.service';

import { PartnerStateService } from '../services/partner-state.service';
import { PublisherHeaderComponent } from '../components/header/header.component';
import { PublisherSidebarComponent } from '../components/sidebar/sidebar.component';
import { PublisherFooterComponent } from '../components/footer/footer.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, CurrencyPipe, PublisherHeaderComponent, PublisherSidebarComponent, PublisherFooterComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private settingsService = inject(PartnerSettingsService);
  private dashboardService = inject(PartnerDashboardService);
  private partnerStateService = inject(PartnerStateService);
  private authService = inject(PartnerAuthService);
  private router = inject(Router);

  private routerSubscription!: Subscription;

  // Layout & Sidebar
  currentRoute = '';
  isReportsExpanded = false;
  companyInitials = 'NX';
  publisherIdShort = '8492';
  overviewData: OverviewResponse | null = null;

  // Tabs
  activeTab: 'profile' | 'company' | 'payment' = 'profile';

  // ─── Profile Form State ───
  profileForm!: FormGroup;
  originalValues = { fullName: '', phoneNumber: '' };
  isLoading = true;
  isSaving = false;
  errorMessage = '';

  // Logo Upload State
  selectedLogoFile: File | null = null;
  logoPreview: string | null = null;
  existingLogoUrl: string | null = null;
  logoUrl: string | null = null;
  logoValidationError = '';

  // ─── Company Form State ───
  countryOptions = COUNTRY_OPTIONS;
  companyForm!: FormGroup;
  hasViewedTerms = false;
  termsAccepted = false;
  isCompanyLoading = false;
  isCompanySaving = false;
  companyErrorMessage = '';
  companyOriginalValues: UpdateCompanyRequest | null = null;
  showTermsModal = false;

  // ─── Payment Form State ───
  payoutMethodOptions = PAYOUT_METHOD_OPTIONS;
  accountTypeOptions = ACCOUNT_TYPE_OPTIONS;
  paymentForm!: FormGroup;
  isPaymentLoading = false;
  isPaymentSaving = false;
  paymentErrorMessage = '';
  paymentOriginalValues: Record<string, any> | null = null;

  // ─── Shared Toast ───
  showSuccessToast = false;
  successToastMessage = '';
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.currentRoute = this.router.url;
    this.routerSubscription = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => (this.currentRoute = e.urlAfterRedirects));

    this.initProfileForm();
    this.initCompanyForm();
    this.initPaymentForm();

    this.dashboardService.getOverview().subscribe({
      next: (res) => {
        this.overviewData = res;
        this.logoUrl = res.logoUrl || null;
        this.companyInitials = this.getInitials(res.companyName);
      },
      error: () => {},
    });

    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // ─── Form Initialization ───

  private initProfileForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      email: [{ value: '', disabled: true }],
      phoneNumber: ['', [Validators.maxLength(30)]],
    });
  }

  private initCompanyForm(): void {
    this.companyForm = this.fb.group({
      legalName: ['', [Validators.required, Validators.maxLength(200)]],
      tradingName: ['', [Validators.maxLength(200)]],
      iframeOrigin: ['', [iframeOriginValidator, Validators.maxLength(255)]],
      registrationNumber: ['', [Validators.maxLength(100)]],
      countryCode: ['', [Validators.required]],
      registeredAddress: ['', [Validators.maxLength(500)]],
      taxResidencyCountry: ['', [Validators.required]],
      taxRegistrationNumber: ['', [Validators.maxLength(100)]],
      contactFullName: ['', [Validators.required, Validators.maxLength(100)]],
      contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      contactPhoneNumber: ['', [Validators.maxLength(30)]],
    });
  }

  private initPaymentForm(): void {
    this.paymentForm = this.fb.group({
      payoutMethod: ['BankTransfer', [Validators.required]],
      bankName: ['', [Validators.maxLength(200)]],
      accountName: ['', [Validators.maxLength(200)]],
      accountHolderName: ['', [Validators.maxLength(200)]],
      accountHolderAddress: ['', [Validators.maxLength(500)]],
      accountType: ['', [Validators.required]],
      accountNumber: ['', [Validators.maxLength(100)]],
      routingNumber: ['', [Validators.maxLength(100)]],
      swiftCode: ['', [Validators.maxLength(50)]],
      iban: ['', [Validators.maxLength(100)]],
      currency: ['', [Validators.maxLength(10)]],
      countryCode: ['', [Validators.required]],
      transferType: ['', [Validators.maxLength(100)]],
    });
  }

  // ─── Profile Logic ───

  private loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.settingsService.getProfile().subscribe({
      next: (res: ProfileResponse) => {
        const phone = res.phoneNumber || '';
        this.profileForm.patchValue({
          fullName: res.fullName || '',
          email: res.email || '',
          phoneNumber: phone,
        });
        this.originalValues = {
          fullName: (res.fullName || '').trim(),
          phoneNumber: phone.trim(),
        };
        this.existingLogoUrl = res.logoUrl || null;
        this.profileForm.markAsPristine();
        this.isLoading = false;
      },
      error: (err) => {
        const msgs = parseBackendError(err);
        this.errorMessage = msgs[0] || 'Failed to load profile data.';
        this.isLoading = false;
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.logoValidationError = 'Please select a valid image file (JPG, PNG, or WEBP).';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.logoValidationError = 'File size must not exceed 5MB.';
      return;
    }

    this.logoValidationError = '';
    this.selectedLogoFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onRemoveLogo(): void {
    this.selectedLogoFile = null;
    this.logoPreview = null;
    this.logoValidationError = '';
  }

  get isFormDirty(): boolean {
    if (!this.profileForm) return false;
    const currentName = (this.profileForm.get('fullName')?.value || '').trim();
    const currentPhone = (this.profileForm.get('phoneNumber')?.value || '').trim();
    const isTextChanged =
      currentName !== this.originalValues.fullName ||
      currentPhone !== this.originalValues.phoneNumber;
    return isTextChanged || this.selectedLogoFile !== null;
  }

  onSave(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    if (!this.isFormDirty) return;

    this.isSaving = true;
    this.errorMessage = '';
    const fullName = (this.profileForm.get('fullName')?.value || '').trim();
    const phoneNumberRaw = (this.profileForm.get('phoneNumber')?.value || '').trim();

    const formData = new FormData();
    formData.append('fullName', fullName);
    if (phoneNumberRaw) {
      formData.append('phoneNumber', phoneNumberRaw);
    }
    if (this.selectedLogoFile) {
      formData.append('logo', this.selectedLogoFile);
    }

    this.settingsService.updateProfile(formData).subscribe({
      next: (res: { logoUrl?: string } | null) => {
        this.isSaving = false;
        this.originalValues = { fullName, phoneNumber: phoneNumberRaw };
        if (res && res.logoUrl) {
          this.existingLogoUrl = res.logoUrl;
          this.logoUrl = res.logoUrl;
        } else if (this.logoPreview) {
          this.existingLogoUrl = this.logoPreview;
          this.logoUrl = this.logoPreview;
        }
        this.partnerStateService.updateLogo(this.logoUrl);
        this.selectedLogoFile = null;
        this.logoPreview = null;
        this.logoValidationError = '';
        this.profileForm.markAsPristine();
        this.triggerToast('Profile updated successfully!');
      },
      error: (err) => {
        this.isSaving = false;
        const msgs = parseBackendError(err);
        this.errorMessage = msgs[0] || 'Failed to update profile settings.';
      },
    });
  }

  onImageError(event?: Event): void {
    this.logoUrl = null;
  }

  onDiscard(): void {
    this.profileForm.patchValue({
      fullName: this.originalValues.fullName,
      phoneNumber: this.originalValues.phoneNumber,
    });
    this.selectedLogoFile = null;
    this.logoPreview = null;
    this.logoValidationError = '';
    this.profileForm.markAsPristine();
    this.errorMessage = '';
  }

  // ─── Company Logic ───

  loadCompany(): void {
    this.isCompanyLoading = true;
    this.companyErrorMessage = '';
    this.settingsService.getCompany().subscribe({
      next: (res: CompanyResponse) => {
        const data = {
          legalName: res.legalName || '',
          tradingName: res.tradingName || '',
          iframeOrigin: res.iframeOrigin || '',
          registrationNumber: res.registrationNumber || '',
          countryCode: res.countryCode || '',
          registeredAddress: res.registeredAddress || '',
          taxResidencyCountry: res.taxResidencyCountry || '',
          taxRegistrationNumber: res.taxRegistrationNumber || '',
          contactFullName: res.contactFullName || '',
          contactEmail: res.contactEmail || '',
          contactPhoneNumber: res.contactPhoneNumber || '',
        };
        this.companyForm.patchValue(data);
        this.companyOriginalValues = { ...data };
        this.companyForm.markAsPristine();
        this.isCompanyLoading = false;
      },
      error: (err) => {
        const msgs = parseBackendError(err);
        this.companyErrorMessage = msgs[0] || 'Failed to load company settings.';
        this.isCompanyLoading = false;
      },
    });
  }

  get isCompanyFormDirty(): boolean {
    if (!this.companyForm || !this.companyOriginalValues) return false;
    const v = this.companyForm.value;
    const orig = this.companyOriginalValues;
    return (
      (v.legalName || '').trim() !== (orig.legalName || '').trim() ||
      (v.tradingName || '').trim() !== (orig.tradingName || '').trim() ||
      (v.registrationNumber || '').trim() !== (orig.registrationNumber || '').trim() ||
      (v.countryCode || '').trim() !== (orig.countryCode || '').trim() ||
      (v.registeredAddress || '').trim() !== (orig.registeredAddress || '').trim() ||
      (v.taxResidencyCountry || '').trim() !== (orig.taxResidencyCountry || '').trim() ||
      (v.taxRegistrationNumber || '').trim() !== (orig.taxRegistrationNumber || '').trim() ||
      (v.contactFullName || '').trim() !== (orig.contactFullName || '').trim() ||
      (v.contactEmail || '').trim() !== (orig.contactEmail || '').trim() ||
      (v.contactPhoneNumber || '').trim() !== (orig.contactPhoneNumber || '').trim() ||
      (v.iframeOrigin || '').trim() !== (orig.iframeOrigin || '').trim()
    );
  }

  isRequiredFieldsFilled(): boolean {
    if (!this.companyForm) return false;
    const v = this.companyForm.value;
    const emailControl = this.companyForm.get('contactEmail');
    const emailValid = emailControl && !emailControl.hasError('email') && !!v.contactEmail?.trim();
    return !!(v.legalName?.trim() && v.countryCode?.trim() && v.taxResidencyCountry?.trim() && v.contactFullName?.trim() && emailValid);
  }

  onViewTerms(): void { this.hasViewedTerms = true; this.showTermsModal = true; }
  closeTermsModal(): void { this.showTermsModal = false; }

  get canAcceptTerms(): boolean { return this.isRequiredFieldsFilled() && this.hasViewedTerms; }
  get canSaveCompany(): boolean { return this.companyForm.valid && this.termsAccepted && this.isCompanyFormDirty && !this.isCompanySaving; }

  onSaveCompany(): void {
    if (this.companyForm.invalid) { this.companyForm.markAllAsTouched(); return; }
    if (!this.termsAccepted) return;
    this.isCompanySaving = true;
    this.companyErrorMessage = '';
    const v = this.companyForm.value;
    const body: UpdateCompanyRequest = {
      legalName: v.legalName.trim(),
      tradingName: v.tradingName?.trim() || null,
      iframeOrigin: v.iframeOrigin?.trim() || null,
      registrationNumber: v.registrationNumber?.trim() || null,
      countryCode: v.countryCode.trim(),
      registeredAddress: v.registeredAddress?.trim() || null,
      taxResidencyCountry: v.taxResidencyCountry.trim(),
      taxRegistrationNumber: v.taxRegistrationNumber?.trim() || null,
      contactFullName: v.contactFullName.trim(),
      contactEmail: v.contactEmail.trim(),
      contactPhoneNumber: v.contactPhoneNumber?.trim() || null,
    };
    this.settingsService.updateCompany(body).subscribe({
      next: () => {
        this.isCompanySaving = false;
        this.companyOriginalValues = {
          legalName: body.legalName, tradingName: body.tradingName || '',
          iframeOrigin: body.iframeOrigin || '',
          registrationNumber: body.registrationNumber || '', countryCode: body.countryCode,
          registeredAddress: body.registeredAddress || '', taxResidencyCountry: body.taxResidencyCountry,
          taxRegistrationNumber: body.taxRegistrationNumber || '', contactFullName: body.contactFullName,
          contactEmail: body.contactEmail, contactPhoneNumber: body.contactPhoneNumber || '',
        };
        this.companyForm.markAsPristine();
        this.triggerToast('Company details saved successfully');
      },
      error: (err) => {
        this.isCompanySaving = false;
        const msgs = parseBackendError(err);
        this.companyErrorMessage = msgs[0] || 'Failed to update company details.';
      },
    });
  }

  // ─── Payment Logic ───

  loadPayment(): void {
    this.isPaymentLoading = true;
    this.paymentErrorMessage = '';
    this.settingsService.getPayment().subscribe({
      next: (res: PaymentResponse) => {
        const data = {
          payoutMethod: res.payoutMethod || 'BankTransfer',
          bankName: res.bankName || '',
          accountName: res.accountName || '',
          accountHolderName: res.accountHolderName || '',
          accountHolderAddress: res.accountHolderAddress || '',
          accountType: res.accountType || '',
          accountNumber: res.accountNumber || '',
          routingNumber: res.routingNumber || '',
          swiftCode: res.swiftCode || '',
          iban: res.iban || '',
          currency: res.currency || '',
          countryCode: res.country || '',
          transferType: res.transferType || '',
        };
        this.paymentForm.patchValue(data);
        this.paymentOriginalValues = { ...data };
        this.paymentForm.markAsPristine();
        this.isPaymentLoading = false;
      },
      error: (err) => {
        // Empty state — no payment info yet; do NOT treat as error
        this.paymentOriginalValues = {};
        this.isPaymentLoading = false;
      },
    });
  }

  get isPaymentFormDirty(): boolean {
    if (!this.paymentForm || !this.paymentOriginalValues) return false;
    const v = this.paymentForm.value;
    const orig = this.paymentOriginalValues;
    const fields: (keyof typeof v)[] = [
      'payoutMethod','bankName','accountName','accountHolderName','accountHolderAddress',
      'accountType','accountNumber','routingNumber','swiftCode','iban','currency','countryCode','transferType'
    ];
    return fields.some(f => (v[f] || '').trim() !== (orig[f as string] || '').trim());
  }

  get canSavePayment(): boolean {
    return this.paymentForm.valid && this.isPaymentFormDirty && !this.isPaymentSaving;
  }

  onSavePayment(): void {
    if (this.paymentForm.invalid) { this.paymentForm.markAllAsTouched(); return; }
    this.isPaymentSaving = true;
    this.paymentErrorMessage = '';
    const v = this.paymentForm.value;
    const body: UpdatePaymentRequest = {
      payoutMethod: v.payoutMethod,
      bankName: v.bankName?.trim() || null,
      accountName: v.accountName?.trim() || null,
      accountHolderName: v.accountHolderName?.trim() || null,
      accountHolderAddress: v.accountHolderAddress?.trim() || null,
      accountType: v.accountType,
      accountNumber: v.accountNumber?.trim() || null,
      routingNumber: v.routingNumber?.trim() || null,
      swiftCode: v.swiftCode?.trim() || null,
      iban: v.iban?.trim() || null,
      currency: v.currency?.trim() || null,
      countryCode: v.countryCode,
      transferType: v.transferType?.trim() || null,
    };
    this.settingsService.updatePayment(body).subscribe({
      next: () => {
        this.isPaymentSaving = false;
        this.paymentOriginalValues = { ...v };
        this.paymentForm.markAsPristine();
        this.triggerToast('Payment details updated successfully!');
      },
      error: (err) => {
        this.isPaymentSaving = false;
        const msgs = parseBackendError(err);
        this.paymentErrorMessage = msgs[0] || 'Failed to update payment settings.';
      },
    });
  }

  onDiscardPayment(): void {
    if (this.paymentOriginalValues) {
      this.paymentForm.patchValue(this.paymentOriginalValues);
    }
    this.paymentForm.markAsPristine();
    this.paymentErrorMessage = '';
  }

  // ─── Shared ───

  selectTab(tab: 'profile' | 'company' | 'payment'): void {
    this.activeTab = tab;
    if (tab === 'company' && this.companyOriginalValues === null) this.loadCompany();
    if (tab === 'payment' && this.paymentOriginalValues === null) this.loadPayment();
  }

  triggerToast(msg: string): void {
    this.successToastMessage = msg;
    this.showSuccessToast = true;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => { this.showSuccessToast = false; }, 3000);
  }

  getInitials(name: string): string {
    if (!name) return 'NX';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  toggleReportsMenu(): void { this.isReportsExpanded = !this.isReportsExpanded; }

  onLogout(): void {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    this.dashboardService.logoutBackend(refreshToken).subscribe({
      next: () => this.authService.logout(),
      error: () => this.authService.logout(),
    });
  }
}
