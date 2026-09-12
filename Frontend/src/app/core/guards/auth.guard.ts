import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Autorise uniquement les utilisateurs connectés.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // On conserve l’adresse demandée pour pouvoir
  // y revenir après la connexion.
  return router.createUrlTree(['/connexion'], {
    queryParams: {
      returnUrl: state.url,
    },
  });
};
