import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PartnerAuthService } from '../services/partner-auth.service';

export const partnerAuthGuard: CanActivateFn = () => {
  const authService = inject(PartnerAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
