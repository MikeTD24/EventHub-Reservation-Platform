import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Evenement } from '../../../../core/models/evenement.model';
import { ReservationParticipant } from '../../../../core/models/reservation.model';
import { ReservationService } from '../../../../core/services/reservation.service';

@Component({
  selector: 'app-admin-event-participants',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-event-participants.html',
  styleUrl: './admin-event-participants.scss',
})
export class AdminEventParticipants implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly reservationService = inject(ReservationService);

  readonly evenement = signal<Evenement | null>(null);
  readonly reservations = signal<ReservationParticipant[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  /**
   * Les réservations annulées restent dans l’historique,
   * mais ne représentent plus des inscriptions actives.
   */
  readonly reservationsConfirmees = computed(() =>
    this.reservations().filter((reservation) => reservation.statut === 'confirmee'),
  );

  readonly reservationsAnnuleesCount = computed(
    () => this.reservations().filter((reservation) => reservation.statut === 'annulee').length,
  );

  /**
   * Un même utilisateur peut apparaître dans l’historique plusieurs fois.
   * Le Set permet de compter chaque participant actif une seule fois.
   */
  readonly participantsCount = computed(
    () =>
      new Set(this.reservationsConfirmees().map((reservation) => reservation.id_utilisateur)).size,
  );

  readonly placesReservees = computed(() =>
    this.reservationsConfirmees().reduce(
      (total, reservation) => total + reservation.nombre_places,
      0,
    ),
  );

  ngOnInit(): void {
    const id = Number(this.activatedRoute.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id < 1) {
      this.isLoading.set(false);
      this.errorMessage.set('L’identifiant de l’événement est invalide.');
      return;
    }

    this.loadParticipants(id);
  }

  /**
   * Charge simultanément les informations de l’événement
   * et ses réservations depuis l’endpoint administrateur.
   */
  loadParticipants(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.reservationService
      .getReservationsByEvenement(id)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.evenement.set(response.evenement);
          this.reservations.set(response.reservations);
        },

        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Impossible de charger les participants.'),
          );
        },
      });
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 0) {
      return 'Impossible de joindre le serveur.';
    }

    return error.error?.message ?? fallback;
  }
}
