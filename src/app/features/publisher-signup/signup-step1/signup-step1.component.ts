import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { PublisherSignupService } from '../publisher-signup.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

function hasUppercase(control: AbstractControl): ValidationErrors | null {
  if (control.value && !/[A-Z]/.test(control.value)) {
    return { missingUppercase: true };
  }
  return null;
}

function hasLowercase(control: AbstractControl): ValidationErrors | null {
  if (control.value && !/[a-z]/.test(control.value)) {
    return { missingLowercase: true };
  }
  return null;
}

function hasNumber(control: AbstractControl): ValidationErrors | null {
  if (control.value && !/\d/.test(control.value)) {
    return { missingNumber: true };
  }
  return null;
}

@Component({
  selector: 'app-signup-step1',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup-step1.component.html',
  styleUrl: './signup-step1.component.css',
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
export class SignupStep1Component implements OnInit {
  private router = inject(Router);
  private signupService = inject(PublisherSignupService);

  signupError: string | null = null;
  isEmailConflict = false;

  form = new FormGroup(
    {
      fullName: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150),
      ]),
      email: new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(255),
      ]),
      companyName: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200),
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(100),
        hasUppercase,
        hasLowercase,
        hasNumber,
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    if (this.signupService.step1Data) {
      this.form.patchValue(this.signupService.step1Data);
    } else if (this.signupService.currentData.email) {
      const { fullName, email, companyName, password } = this.signupService.currentData;
      this.form.patchValue({ fullName, email, companyName, password });
    }

    const err = this.signupService.signupError;
    if (err) {
      this.signupError = err;
      if (err.toLowerCase().includes('email') || err.includes('already exists')) {
        this.isEmailConflict = true;
      }
      this.signupService.clearSignupError();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.signupService.saveStep1Data(this.form.value);
    this.router.navigate(['/signup/step2']);
  }
}
