import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  PublisherSignupService,
  COUNTRY_OPTIONS,
  STORE_CATEGORY_OPTIONS,
} from '../publisher-signup.service';

@Component({
  selector: 'app-signup-step2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup-step2.component.html',
  styleUrl: './signup-step2.component.css',
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
export class SignupStep2Component implements OnInit {
  private router = inject(Router);
  private signupService = inject(PublisherSignupService);

  countries = COUNTRY_OPTIONS;
  categories = STORE_CATEGORY_OPTIONS;

  form = new FormGroup({
    websiteUrl: new FormControl('', [Validators.required]),
    countryCode: new FormControl('', [Validators.required]),
    monthlyActiveUsers: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    storeCategory: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    if (this.signupService.step2Data) {
      this.form.patchValue(this.signupService.step2Data);
    } else if (this.signupService.currentData.websiteUrl) {
      const { websiteUrl, countryCode, monthlyActiveUsers, storeCategory } = this.signupService.currentData;
      this.form.patchValue({ websiteUrl, countryCode, monthlyActiveUsers, storeCategory });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.signupService.saveStep2Data(this.form.value);
    this.router.navigate(['/signup/step3']);
  }
}
