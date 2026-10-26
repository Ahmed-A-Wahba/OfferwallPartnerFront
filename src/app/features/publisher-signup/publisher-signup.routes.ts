import { Routes } from '@angular/router';
import { SignupStep1Component } from './signup-step1/signup-step1.component';
import { SignupStep2Component } from './signup-step2/signup-step2.component';
import { SignupStep3Component } from './signup-step3/signup-step3.component';
import { SignupStep4Component } from './signup-step4/signup-step4.component';

export const publisherSignupRoutes: Routes = [
  { path: 'step1', component: SignupStep1Component, data: { step: 1 } },
  { path: 'step2', component: SignupStep2Component, data: { step: 2 } },
  { path: 'step3', component: SignupStep3Component, data: { step: 3 } },
  { path: 'step4', component: SignupStep4Component, data: { step: 4 } },
  { path: '', redirectTo: 'step1', pathMatch: 'full' },
];
