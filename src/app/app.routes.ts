import { Routes } from '@angular/router';
import { partnerAuthGuard } from './features/publisher-login/guards/partner-auth.guard';

export const routes: Routes = [
  {
    path: 'signup',
    loadChildren: () =>
      import('./features/publisher-signup/publisher-signup.routes').then(
        (m) => m.publisherSignupRoutes
      ),
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./features/publisher-login/auth.routes').then(
        (m) => m.authRoutes
      ),
  },
  {
    path: 'dashboard',
    canActivate: [partnerAuthGuard],
    loadChildren: () =>
      import('./features/publisher-dashboard/dashboard.routes').then(
        (m) => m.dashboardRoutes
      ),
  },
  { path: 'iframe', redirectTo: 'dashboard/iframe', pathMatch: 'full' },
  { path: 'reports/redemptions', redirectTo: 'dashboard/reports/redemptions', pathMatch: 'full' },
  { path: 'payouts', redirectTo: 'dashboard/payouts', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'dashboard/settings', pathMatch: 'full' },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
