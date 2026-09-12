import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Reservation,
  ReservationPayload,
  ReservationResponse,
  ReservationUpdatePayload,
  ReservationsEvenementResponse,
} from '../models/reservation.model';

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/reservations';
  private readonly evenementApiUrl = '/api/events';

  getMesReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.apiUrl);
  }

  createReservation(payload: ReservationPayload): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(this.apiUrl, payload);
  }

  updateReservation(
    id: number,
    payload: ReservationUpdatePayload,
  ): Observable<ReservationResponse> {
    return this.http.put<ReservationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  cancelReservation(id: number): Observable<ReservationResponse> {
    return this.http.patch<ReservationResponse>(`${this.apiUrl}/${id}/cancel`, {});
  }

  /**
   * Récupère les réservations d’un événement.
   * L’API réserve cette opération aux administrateurs.
   */
  getReservationsByEvenement(id: number): Observable<ReservationsEvenementResponse> {
    return this.http.get<ReservationsEvenementResponse>(
      `${this.evenementApiUrl}/${id}/reservations`,
    );
  }
}
