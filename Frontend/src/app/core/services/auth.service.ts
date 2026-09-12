import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
} from '../models/auth-response.model';
import { Utilisateur } from '../models/utilisateur.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/auth';

  private readonly tokenKey = 'eventhub_token';
  private readonly utilisateurKey = 'eventhub_utilisateur';

  private readonly tokenState = signal<string | null>(this.readStoredToken());

  /*
   * Au démarrage, on restaure l’utilisateur sauvegardé
   * afin de conserver la connexion après un rafraîchissement.
   */
  private readonly utilisateurState = signal<Utilisateur | null>(
    this.tokenState() ? this.readStoredUtilisateur() : null,
  );

  readonly utilisateur = this.utilisateurState.asReadonly();

  readonly isAuthenticated = computed(
    () => this.utilisateurState() !== null && this.tokenState() !== null,
  );

  readonly isAdmin = computed(() => this.utilisateurState()?.role === 'admin');

  login(donnees: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, donnees).pipe(
      tap((response) => {
        this.saveSession(response.token, response.utilisateur);
      }),
    );
  }

  register(donnees: RegisterPayload): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, donnees);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.utilisateurKey);
    this.tokenState.set(null);
    this.utilisateurState.set(null);
  }

  getToken(): string | null {
    const token = this.tokenState();

    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token)) {
      this.logout();
      return null;
    }

    return token;
  }

  private saveSession(token: string, utilisateur: Utilisateur): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.utilisateurKey, JSON.stringify(utilisateur));

    this.tokenState.set(token);
    this.utilisateurState.set(utilisateur);
  }

  /**
   * Restaure uniquement un JWT encore valide.
   * Sa signature reste toujours vérifiée par le backend.
   */
  private readStoredToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);

    if (!token || this.isTokenExpired(token)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.utilisateurKey);
      return null;
    }

    return token;
  }

  /**
   * Le champ exp d’un JWT contient une date Unix exprimée en secondes.
   * Un token illisible est considéré comme invalide.
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payloadPart = token.split('.')[1];

      if (!payloadPart) {
        return true;
      }

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(paddedBase64)) as { exp?: number };

      return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  private readStoredUtilisateur(): Utilisateur | null {
    const valeur = localStorage.getItem(this.utilisateurKey);

    if (!valeur) {
      return null;
    }

    try {
      return JSON.parse(valeur) as Utilisateur;
    } catch {
      /*
       * Une valeur illisible ne doit pas empêcher
       * le démarrage de l’application.
       */
      localStorage.removeItem(this.utilisateurKey);
      return null;
    }
  }
}
