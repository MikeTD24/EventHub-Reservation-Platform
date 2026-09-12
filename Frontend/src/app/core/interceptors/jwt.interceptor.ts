import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Ajoute automatiquement le token JWT aux requêtes
 * envoyées vers notre API backend.
 */
export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Évite d’envoyer notre token à une autre API ou à un autre domaine.
  const isBackendRequest = request.url.startsWith('/api/');
  const isAuthenticationRequest = request.url.startsWith('/api/auth/');

  if (!isBackendRequest) {
    return next(request);
  }

  // Une requête HTTP Angular est immuable :
  // il faut donc la cloner pour ajouter l’en-tête.
  const authenticatedRequest = token
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthenticationRequest) {
        const returnUrl = router.url;

        authService.logout();

        if (!returnUrl.startsWith('/connexion')) {
          void router.navigate(['/connexion'], {
            queryParams: {
              session: 'expiree',
              returnUrl,
            },
          });
        }
      }

      return throwError(() => error);
    }),
  );
};
