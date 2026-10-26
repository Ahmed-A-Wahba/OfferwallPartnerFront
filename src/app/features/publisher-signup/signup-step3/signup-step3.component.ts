import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { PublisherSignupService, parseBackendError } from '../publisher-signup.service';

function iframeOriginValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value?.trim();
  if (!value) {
    return null;
  }
  
  // Basic validation to match C# backend expectations
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return null;
    }
  } catch (e) {
    // Check if it's just 'localhost' or 'http://localhost' format
    const lowerVal = value.toLowerCase();
    if (lowerVal === 'localhost' || lowerVal.startsWith('localhost:')) {
      return null;
    }
  }
  return { invalidOrigin: true };
}

@Component({
  selector: 'app-signup-step3',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup-step3.component.html',
  styleUrl: './signup-step3.component.css',
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
export class SignupStep3Component implements OnInit {
  private router = inject(Router);
  private signupService = inject(PublisherSignupService);

  isLoading = false;
  errorMessages: string[] = [];

  form = new FormGroup({
    allowedIframeOrigin: new FormControl('', [iframeOriginValidator]),
  });

  ngOnInit(): void {
    if (this.signupService.step3Data) {
      this.form.patchValue(this.signupService.step3Data);
    } else if (this.signupService.currentData.allowedIframeOrigin) {
      this.form.patchValue({ allowedIframeOrigin: this.signupService.currentData.allowedIframeOrigin });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.signupService.saveStep3Data(this.form.value);

    this.isLoading = true;
    this.errorMessages = [];

    const origin = this.form.value.allowedIframeOrigin?.trim() || null;

    this.signupService.register(origin).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/signup/step4']);
      },
      error: (err) => {
        this.isLoading = false;
        const parsedMsgs = parseBackendError(err);
        
        const hasEmailError = parsedMsgs.some(msg => 
          msg.toLowerCase().includes('email') || 
          msg.includes('Partner.EmailAlreadyExists')
        );
        const hasEmailCode = JSON.stringify(err).includes('Partner.EmailAlreadyExists');

        if (hasEmailError || hasEmailCode) {
          const finalErrorMsg = parsedMsgs.find(msg => msg.toLowerCase().includes('email')) 
            || 'A partner with this email already exists.';
          this.signupService.setSignupError(finalErrorMsg);
          this.router.navigate(['/signup/step1']);
        } else {
          this.errorMessages = parsedMsgs;
        }
      },
    });
  }
}
