import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { IframeIntegrationComponent } from './iframe-integration/iframe-integration.component';
import { RedemptionsComponent } from './redemptions/redemptions.component';
import { PayoutsComponent } from './payouts/payouts.component';
import { SettingsComponent } from './settings/settings.component';

export const dashboardRoutes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'iframe', component: IframeIntegrationComponent },
  { path: 'reports/redemptions', component: RedemptionsComponent },
  { path: 'payouts', component: PayoutsComponent },
  { path: 'settings', component: SettingsComponent },
];
