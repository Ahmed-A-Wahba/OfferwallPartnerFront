import { Component, inject, ElementRef, ViewChildren, QueryList, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { PublisherSignupService, parseBackendError } from '../publisher-signup.service';

@Component({
  selector: 'app-signup-step4',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup-step4.component.html',
  styleUrl: './signup-step4.component.css',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-40px)' })),
      ]),
    ]),
  ],
})
export class SignupStep4Component implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private router = inject(Router);
  private signupService = inject(PublisherSignupService);

  otpSlots = [0, 1, 2, 3, 4, 5];
  otpValues: string[] = ['', '', '', '', '', ''];

  isLoading = false;
  isResending = false;
  isSuccess = false;
  isError = false;
  errorMessage = '';
  isResendSuccess = false;
  isResendError = false;
  resendErrorMessage = '';

  // Resend Cooldown State
  resendCooldownSeconds = 0;
  private resendTimerInterval: ReturnType<typeof setInterval> | null = null;

  get userEmail(): string {
    return this.signupService.currentData.email || 'your email';
  }

  get resendCooldownDisplay(): string {
    const mins = Math.floor(this.resendCooldownSeconds / 60);
    const secs = this.resendCooldownSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  ngOnInit(): void {
    // Start initial 120-second cooldown timer when component initializes
    this.startResendCooldown(120);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.focusFirstBox();
    });
  }

  ngOnDestroy(): void {
    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
    }
  }

  startResendCooldown(seconds: number = 120): void {
    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
    }
    this.resendCooldownSeconds = seconds;
    this.resendTimerInterval = setInterval(() => {
      this.resendCooldownSeconds--;
      if (this.resendCooldownSeconds <= 0) {
        this.resendCooldownSeconds = 0;
        if (this.resendTimerInterval) {
          clearInterval(this.resendTimerInterval);
          this.resendTimerInterval = null;
        }
      }
    }, 1000);
  }

  clearError(): void {
    this.isError = false;
    this.errorMessage = '';
  }

  clearOtpInputs(): void {
    this.otpValues = ['', '', '', '', '', ''];
    if (this.otpInputs) {
      this.otpInputs.forEach((input) => (input.nativeElement.value = ''));
    }
  }

  focusFirstBox(): void {
    setTimeout(() => {
      if (this.otpInputs && this.otpInputs.first) {
        this.otpInputs.first.nativeElement.focus();
      } else {
        const inputs = document.querySelectorAll('.otp-input');
        (inputs[0] as HTMLElement)?.focus();
      }
    }, 100);
  }

  onOtpInput(event: Event, index: number): void {
    this.clearError();
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');
    input.value = value;
    this.otpValues[index] = value;

    if (value && index < 5) {
      const inputs = this.otpInputs.toArray();
      if (inputs[index + 1]) {
        inputs[index + 1].nativeElement.focus();
      }
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpValues[index] && index > 0) {
      const inputs = this.otpInputs.toArray();
      if (inputs[index - 1]) {
        inputs[index - 1].nativeElement.focus();
      }
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    this.clearError();
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text')?.replace(/[^0-9]/g, '') || '';
    const inputs = this.otpInputs.toArray();
    for (let i = 0; i < Math.min(pasted.length, 6); i++) {
      this.otpValues[i] = pasted[i];
      if (inputs[i]) {
        inputs[i].nativeElement.value = pasted[i];
      }
    }
    const focusIndex = Math.min(pasted.length, 5);
    if (inputs[focusIndex]) {
      inputs[focusIndex].nativeElement.focus();
    }
  }

  onVerify(): void {
    const otp = this.otpValues.join('');
    if (otp.length !== 6) {
      this.isError = true;
      this.errorMessage = 'Please enter all 6 digits.';
      return;
    }

    this.isLoading = true;
    this.isError = false;
    this.errorMessage = '';

    const email = this.signupService.currentData.email;

    this.signupService.verifyOtp(email, otp).subscribe({
      next: (result: { isSuccess?: boolean; error?: { description?: string } } | null) => {
        this.isLoading = false;
        if (result && result.isSuccess === false) {
          this.isError = true;
          this.errorMessage = result.error?.description || 'The code you entered is incorrect or has expired. Please try again.';
          this.clearOtpInputs();
          this.focusFirstBox();
        } else {
          this.isSuccess = true;
          this.isError = false;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
      },
      error: (err: { status?: number }) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.isError = true;

        switch (err.status) {
          case 400:
            this.errorMessage = 'The code you entered is incorrect or has expired. Please try again.';
            break;

          case 404:
            this.errorMessage = 'No account was found with this email address.';
            break;

          case 409:
            this.errorMessage = 'This email has already been verified.';
            break;

          case 500:
            this.errorMessage = 'Something went wrong. Please try again later.';
            break;

          default:
            this.errorMessage = 'An unexpected error occurred. Please try again.';
            break;
        }

        this.clearOtpInputs();
        this.focusFirstBox();
      },
    });
  }

  onResendCode(): void {
    if (this.resendCooldownSeconds > 0 || this.isResending) {
      return;
    }

    this.isResending = true;
    this.isResendSuccess = false;
    this.isResendError = false;
    this.resendErrorMessage = '';
    this.isError = false;
    this.errorMessage = '';

    const email = this.signupService.currentData.email;
    this.signupService.resendCode(email).subscribe({
      next: (result: { isSuccess?: boolean; error?: { description?: string } } | null) => {
        this.isResending = false;
        if (result && result.isSuccess === false) {
          this.isResendError = true;
          const parsed = parseBackendError({
            error: result,
            status: 400
          });
          this.resendErrorMessage = result.error?.description
            || parsed[0]
            || 'Failed to resend code. Please try again.';
          setTimeout(() => {
            this.isResendError = false;
            this.resendErrorMessage = '';
          }, 5000);
        } else {
          this.isResendSuccess = true;
          this.startResendCooldown(120);
          setTimeout(() => (this.isResendSuccess = false), 5000);
        }
      },
      error: (err: unknown) => {
        this.isResending = false;
        this.isResendSuccess = false;
        this.isResendError = true;
        const parsed = parseBackendError(err);
        this.resendErrorMessage = parsed[0] || 'Failed to resend code. Please try again.';
        setTimeout(() => {
          this.isResendError = false;
          this.resendErrorMessage = '';
        }, 5000);
      },
    });
  }
}
