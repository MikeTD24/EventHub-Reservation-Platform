import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Evenement } from '../../../../core/models/evenement.model';
import { EvenementService } from '../../../../core/services/evenement.service';

@Component({
  selector: 'app-admin-event-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-event-list.html',
  styleUrl: './admin-event-list.scss',
})
export class AdminEventList implements OnInit {
  private readonly evenementService = inject(EvenementService);

  readonly evenements = signal<Evenement[]>([]);
  readonly isLoading = signal(true);
  readonly deletingId = signal<number | null>(null);
  readonly errorMessage = signal('');
  readonly actionMessage = signal('');
  readonly actionError = signal('');

  /**
   * Indicateurs calculés automatiquement à partir
   * de la liste actuellement chargée.
   */
  readonly evenementCount = computed(() => this.evenements().length);

  readonly upcomingCount = computed(
    () => this.evenements().filter((evenement) => !this.isPast(evenement)).length,
  );

  readonly completeCount = computed(
    () => this.evenements().filter((evenement) => evenement.places_restantes === 0).length,
  );

  /**
   * Une place confirmée représente un participant attendu.
   * Les réservations annulées sont exclues du calcul par le backend.
   */
  readonly participantCount = computed(() =>
    this.evenements().reduce((total, evenement) => total + evenement.places_occupees, 0),
  );

  ngOnInit(): void {
    this.loadEvenements();
  }

  /**
   * Charge tous les événements avec leurs disponibilités
   * calculées par le backend.
   */
  loadEvenements(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.evenementService
      .getEvenements()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (evenements) => {
          this.evenements.set(evenements);
        },

        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Impossible de charger les événements.'),
          );
        },
      });
  }

  /**
   * Supprime un événement après confirmation.
   * Le message rappelle que ses réservations seront
   * également supprimées par la règle de cascade.
   */
  deleteEvenement(evenement: Evenement): void {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer « ${evenement.titre} » ? Ses réservations seront également supprimées.`,
    );

    if (!confirmed) {
      return;
    }

    this.actionMessage.set('');
    this.actionError.set('');
    this.deletingId.set(evenement.id);

    this.evenementService
      .deleteEvenement(evenement.id)
      .pipe(
        finalize(() => {
          this.deletingId.set(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.evenements.update((evenements) =>
            evenements.filter((current) => current.id !== evenement.id),
          );

          this.actionMessage.set(response.message);
        },

        error: (error: HttpErrorResponse) => {
          this.actionError.set(this.getErrorMessage(error, 'Impossible de supprimer l’événement.'));
        },
      });
  }

  /**
   * Calcule un pourcentage borné entre 0 et 100
   * pour sécuriser l’affichage de la jauge.
   */
  fillRate(evenement: Evenement): number {
    if (evenement.places_totales <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((evenement.places_occupees / evenement.places_totales) * 100));
  }

  isPast(evenement: Evenement): boolean {
    return new Date(evenement.date_evenement) <= new Date();
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 0) {
      return 'Impossible de joindre le serveur.';
    }

    return error.error?.message ?? fallback;
  }
}
