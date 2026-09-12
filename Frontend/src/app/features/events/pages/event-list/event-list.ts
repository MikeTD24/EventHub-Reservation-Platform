import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Evenement } from '../../../../core/models/evenement.model';
import { EvenementService } from '../../../../core/services/evenement.service';

type EventFilter = 'all' | 'upcoming' | 'available';

@Component({
  selector: 'app-event-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './event-list.html',
  styleUrl: './event-list.scss',
})
export class EventList implements OnInit {
  private readonly evenementService = inject(EvenementService);

  readonly evenements = signal<Evenement[]>([]);
  readonly activeFilter = signal<EventFilter>('all');
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  /**
   * Applique le filtre choisi sans effectuer une nouvelle requête HTTP.
   * Un événement disponible doit être futur et posséder au moins une place.
   */
  readonly filteredEvenements = computed(() => {
    switch (this.activeFilter()) {
      case 'upcoming':
        return this.evenements().filter((evenement) => !this.isPast(evenement));

      case 'available':
        return this.evenements().filter(
          (evenement) => !this.isPast(evenement) && evenement.places_restantes > 0,
        );

      default:
        return this.evenements();
    }
  });

  ngOnInit(): void {
    this.loadEvenements();
  }

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
          if (error.status === 0) {
            this.errorMessage.set('Impossible de joindre le serveur.');
            return;
          }

          this.errorMessage.set(error.error?.message ?? 'Impossible de charger les événements.');
        },
      });
  }

  setFilter(filter: EventFilter): void {
    this.activeFilter.set(filter);
  }

  occupationPercentage(evenement: Evenement): number {
    if (evenement.places_totales <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((evenement.places_occupees / evenement.places_totales) * 100));
  }

  availabilityClass(evenement: Evenement): string {
    if (this.isPast(evenement)) {
      return 'availability--past';
    }

    if (evenement.places_restantes === 0) {
      return 'availability--full';
    }

    const seuil = Math.max(5, evenement.places_totales * 0.2);

    if (evenement.places_restantes <= seuil) {
      return 'availability--limited';
    }

    return 'availability--available';
  }
  //Affiche Terminé si l'événement est passé
  availabilityLabel(evenement: Evenement): string {
    if (this.isPast(evenement)) {
      return 'Terminé';
    }

    if (evenement.places_restantes === 0) {
      return 'Complet';
    }

    if (this.availabilityClass(evenement) === 'availability--limited') {
      return `${evenement.places_restantes} dernières places`;
    }

    return `${evenement.places_restantes} places disponibles`;
  }

  private isPast(evenement: Evenement): boolean {
    return new Date(evenement.date_evenement).getTime() <= Date.now();
  }
}
