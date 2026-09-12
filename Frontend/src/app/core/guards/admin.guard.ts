import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Autorise uniquement les utilisateurs administrateurs.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Sécurité supplémentaire si ce guard
  // est utilisé sans AuthGuard.
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/connexion'], {
      queryParams: {
        returnUrl: state.url,
      },
    });
  }

  if (authService.isAdmin()) {
    return true;
  }

  // Un utilisateur connecté, mais non administrateur,
  // retourne vers la liste des événements.
  return router.createUrlTree(['/evenements']);
};
