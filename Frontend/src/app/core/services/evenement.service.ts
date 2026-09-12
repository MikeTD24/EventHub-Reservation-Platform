import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiMessage } from '../models/api-response.model';
import { Evenement, EvenementPayload, EvenementResponse } from '../models/evenement.model';

@Injectable({
  providedIn: 'root',
})
export class EvenementService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:3000/api/events';

  /**
   * Récupère tous les événements.
   */
  getEvenements(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>(this.apiUrl);
  }

  /**
   * Récupère un événement grâce à son identifiant.
   */
  getEvenement(id: number): Observable<Evenement> {
    return this.http.get<Evenement>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crée un événement. Cette opération sera réservée
   * aux administrateurs par le backend.
   */
  createEvenement(donnees: EvenementPayload): Observable<EvenementResponse> {
    return this.http.post<EvenementResponse>(this.apiUrl, donnees);
  }

  /**
   * Modifie un événement existant.
   */
  updateEvenement(id: number, donnees: EvenementPayload): Observable<EvenementResponse> {
    return this.http.put<EvenementResponse>(`${this.apiUrl}/${id}`, donnees);
  }

  /**
   * Supprime un événement.
   */
  deleteEvenement(id: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.apiUrl}/${id}`);
  }
}
