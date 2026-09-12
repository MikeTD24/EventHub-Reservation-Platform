import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Evenement } from '../../../../core/models/evenement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { EvenementService } from '../../../../core/services/evenement.service';
import { ReservationService } from '../../../../core/services/reservation.service';

@Component({
  selector: 'app-event-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
})
export class EventDetail implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly evenementService = inject(EvenementService);
  private readonly reservationService = inject(ReservationService);
  private readonly authService = inject(AuthService);

  readonly evenement = signal<Evenement | null>(null);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly reservationError = signal('');
  readonly successMessage = signal('');

  readonly isAuthenticated = this.authService.isAuthenticated;

  readonly reservationForm = this.formBuilder.nonNullable.group({
    nombre_places: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadEvenement();
  }

  loadEvenement(): void {
    const id = Number(this.activatedRoute.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id < 1) {
      this.isLoading.set(false);
      this.errorMessage.set('L’identifiant de l’événement est invalide.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.evenementService
      .getEvenement(id)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (evenement) => {
          this.evenement.set(evenement);
        },

        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Impossible de charger cet événement.'),
          );
        },
      });
  }

  reserver(): void {
    const evenement = this.evenement();

    this.reservationError.set('');
    this.successMessage.set('');

    if (!evenement) {
      return;
    }

    if (!this.isAuthenticated()) {
      void this.router.navigate(['/connexion'], {
        queryParams: {
          returnUrl: this.router.url,
        },
      });

      return;
    }

    const nombrePlaces = this.reservationForm.controls.nombre_places.value;

    if (this.reservationForm.invalid || !Number.isInteger(nombrePlaces)) {
      this.reservationForm.markAllAsTouched();
      return;
    }

    if (nombrePlaces > evenement.places_restantes) {
      this.reservationError.set(`Il ne reste que ${evenement.places_restantes} place(s).`);
      return;
    }

    this.isSubmitting.set(true);

    this.reservationService
      .createReservation({
        id_evenement: evenement.id,
        nombre_places: nombrePlaces,
      })
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message);

          this.evenement.update((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              places_restantes: response.places_restantes,
              places_occupees: current.places_totales - response.places_restantes,
            };
          });

          this.reservationForm.reset({
            nombre_places: 1,
          });
        },

        error: (error: HttpErrorResponse) => {
          this.reservationError.set(
            this.getErrorMessage(error, 'Impossible de créer la réservation.'),
          );
        },
      });
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
