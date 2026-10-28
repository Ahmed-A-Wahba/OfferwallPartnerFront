import { Component, inject, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { PartnerAuthService, parseLoginError } from '../services/partner-auth.service';

const API_URL = '';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(PartnerAuthService);
  private router = inject(Router);
  private http = inject(HttpClient);

  // ─── OTP ViewChildren ───
  @ViewChildren('resetOtpInput') resetOtpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  // ─── State Machine ───
  currentState: 'login' | 'forgot' | 'reset' = 'login';

  // ─── Login State (existing) ───
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  // ─── Forgot State ───
  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  forgotEmailValue = '';
  isSendingCode = false;
  sendCodeError = '';

  // ─── Reset State ───
  resetOtpValues: string[] = ['', '', '', '', '', ''];
  otpError = false;
  resetForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: [this.passwordMatchValidator] }
  );
  showNewPassword = false;
  showConfirmPassword = false;
  isResetting = false;
  resetError = '';
  isResetSuccess = false;

  // ─── Password Strength ───
  passwordStrength = 0; // 0-4
  strengthBars = [1, 2, 3, 4];

  constructor() {
    this.resetForm.get('newPassword')?.valueChanges.subscribe((val) => {
      this.passwordStrength = this.calculateStrength(val || '');
    });
  }

  // ──────────────────────────────────────────────
  // Login Methods (existing, unchanged)
  // ──────────────────────────────────────────────

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        console.log('Backend Error Payload:', err.error);

        const problem = err.error;

        // Extract detail, title, and extension code from ProblemDetails
        const detail: string = problem?.detail || problem?.description || '';
        const title: string = problem?.title || '';
        const code: string = problem?.extensions?.code || title || '';

        // Match domain errors
        if (
          code.includes('AccountPendingApproval') ||
          detail.toLowerCase().includes('pending') ||
          title.includes('AccountPendingApproval')
        ) {
          this.errorMessage = 'Your publisher account is currently pending admin approval. You will be notified once activated.';
        } else if (
          code.includes('EmailNotVerified') ||
          detail.toLowerCase().includes('verified')
        ) {
          this.errorMessage = 'Your email address is not verified yet. Please check your inbox for the verification link.';
        } else if (
          code.includes('InvalidCredentials') ||
          detail.toLowerCase().includes('credentials')
        ) {
          this.errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (detail) {
          this.errorMessage = detail;
        } else {
          this.errorMessage = 'Invalid email or password. Please try again.';
        }
      },
    });
  }

  // ──────────────────────────────────────────────
  // State Navigation
  // ──────────────────────────────────────────────

  goToForgot(): void {
    this.currentState = 'forgot';
    this.sendCodeError = '';
    this.forgotForm.reset();
  }

  goToLogin(): void {
    this.currentState = 'login';
    this.errorMessage = '';
  }

  goToReset(): void {
    this.currentState = 'reset';
    this.resetError = '';
    this.otpError = false;
    this.resetOtpValues = ['', '', '', '', '', ''];
    this.resetForm.reset();
    this.passwordStrength = 0;
  }

  // ──────────────────────────────────────────────
  // Email Masking
  // ──────────────────────────────────────────────

  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [user, domain] = email.split('@');
    if (user.length <= 2) {
      return user[0] + '•'.repeat(Math.max(user.length - 1, 1)) + '@' + domain;
    }
    const masked = user.substring(0, 2) + '•'.repeat(user.length - 2);
    return `${masked}@${domain}`;
  }

  // ──────────────────────────────────────────────
  // Password Strength Calculator
  // ──────────────────────────────────────────────

  calculateStrength(password: string): number {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    return score;
  }

  get strengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength];
  }

  // ──────────────────────────────────────────────
  // Password Match Validator
  // ──────────────────────────────────────────────

  passwordMatchValidator(group: AbstractControl) {
    const pass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  // ──────────────────────────────────────────────
  // Forgot Password — Send Code
  // ──────────────────────────────────────────────

  onSendCode(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isSendingCode = true;
    this.sendCodeError = '';

    const email = this.forgotForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isSendingCode = false;
        this.forgotEmailValue = email!; // Store for the reset step
        this.goToReset();              // Navigate to OTP screen ONLY on success
      },
      error: (err: HttpErrorResponse) => {
        this.isSendingCode = false;
        console.log('Forgot Password Error:', err.error);

        const problem = err.error;
        const detail: string = problem?.detail || problem?.description || '';
        const code: string = problem?.title || problem?.extensions?.code || problem?.code || '';

        if (code.includes('ForgotPasswordCodeAlreadySent') || detail.toLowerCase().includes('already sent')) {
          this.sendCodeError = 'A password reset code was already sent recently. Please check your inbox.';
        } else if (code.includes('EmailNotFound') || detail.toLowerCase().includes('not found')) {
          this.sendCodeError = 'No account found with this email address.';
        } else if (detail) {
          this.sendCodeError = detail;
        } else {
          this.sendCodeError = 'Failed to send reset code. Please try again.';
        }
        // currentState remains 'forgot' — no navigation on failure
      },
    });
  }

  // ──────────────────────────────────────────────
  // OTP Input Handling
  // ──────────────────────────────────────────────

  onResetOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow digits
    if (!/^\d$/.test(value)) {
      input.value = '';
      this.resetOtpValues[index] = '';
      return;
    }

    this.resetOtpValues[index] = value;
    this.otpError = false;

    // Auto-advance to next input
    if (index < 5) {
      const inputs = this.resetOtpInputs.toArray();
      if (inputs[index + 1]) {
        inputs[index + 1].nativeElement.focus();
      }
    }
  }

  onResetOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (this.resetOtpValues[index] === '' && index > 0) {
        const inputs = this.resetOtpInputs.toArray();
        inputs[index - 1].nativeElement.focus();
        this.resetOtpValues[index - 1] = '';
      } else {
        this.resetOtpValues[index] = '';
      }
    }
  }

  onResetOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const digits = paste.replace(/\D/g, '').substring(0, 6);

    for (let i = 0; i < 6; i++) {
      this.resetOtpValues[i] = digits[i] || '';
    }

    this.otpError = false;

    // Focus the next empty or last input
    const inputs = this.resetOtpInputs.toArray();
    const focusIndex = Math.min(digits.length, 5);
    if (inputs[focusIndex]) {
      inputs[focusIndex].nativeElement.focus();
    }
  }

  get otpComplete(): boolean {
    return this.resetOtpValues.join('').length === 6;
  }

  // ──────────────────────────────────────────────
  // Reset Password — Submit
  // ──────────────────────────────────────────────

  get canResetPassword(): boolean {
    const otp = this.resetOtpValues.join('');
    if (otp.length !== 6) return false;
    if (this.resetForm.invalid) return false;
    if (this.passwordStrength < 4) return false;
    return true;
  }

  onResetPassword(): void {
    if (this.resetForm.invalid || !this.canResetPassword) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isResetting = true;
    this.resetError = '';
    this.otpError = false;

    const payload = {
      email: this.forgotEmailValue,
      code: this.resetOtpValues.join(''),
      newPassword: this.resetForm.value.newPassword,
    };

    this.authService.resetPassword(payload).subscribe({
      next: () => {
        this.isResetting = false;
        this.isResetSuccess = true; // Show success checkmark UI
      },
      error: (err: HttpErrorResponse) => {
        this.isResetting = false;
        console.log('Reset Password Error Payload:', err.error);

        const problem = err.error;
        const detail: string = problem?.detail || problem?.description || '';
        const code: string = problem?.title || problem?.extensions?.code || problem?.code || '';

        // Match explicit backend error cases
        if (code.includes('Code.InvalidOrExpired') || detail.toLowerCase().includes('code')) {
          this.otpError = true;
          this.resetError = 'The verification code is invalid or has expired.';
        } else if (code.includes('Partner.NotFound') || detail.toLowerCase().includes('partner')) {
          this.resetError = 'Invalid request or active publisher account not found.';
        } else if (detail) {
          this.resetError = detail;
        } else {
          this.resetError = 'Failed to reset password. Please try again.';
        }
        // currentState remains 'reset' — no navigation on failure
      },
    });
  }
}
