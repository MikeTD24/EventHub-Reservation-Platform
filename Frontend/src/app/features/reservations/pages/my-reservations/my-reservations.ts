import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Reservation, ReservationResponse } from '../../../../core/models/reservation.model';
import { ReservationService } from '../../../../core/services/reservation.service';

@Component({
  selector: 'app-my-reservations',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './my-reservations.html',
  styleUrl: './my-reservations.scss',
})
export class MyReservations implements OnInit {
  private readonly reservationService = inject(ReservationService);
  private readonly formBuilder = inject(FormBuilder);

  readonly reservations = signal<Reservation[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actionMessage = signal('');
  readonly actionError = signal('');
  readonly editingId = signal<number | null>(null);
  readonly actionId = signal<number | null>(null);

  readonly activeCount = computed(
    () => this.reservations().filter((reservation) => reservation.statut === 'confirmee').length,
  );

  readonly editForm = this.formBuilder.nonNullable.group({
    nombre_places: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    this.reservationService
      .getMesReservations()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (reservations) => {
          this.reservations.set(reservations);
        },

        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Impossible de charger vos réservations.'),
          );
        },
      });
  }

  startEditing(reservation: Reservation): void {
    const maximum = this.maximumPlaces(reservation);

    this.editForm.controls.nombre_places.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(maximum),
    ]);

    this.editForm.controls.nombre_places.setValue(reservation.nombre_places);

    this.editForm.controls.nombre_places.updateValueAndValidity();

    this.editingId.set(reservation.id);
    this.actionMessage.set('');
    this.actionError.set('');
  }

  stopEditing(): void {
    this.editingId.set(null);
    this.editForm.reset({
      nombre_places: 1,
    });
  }

  saveReservation(reservation: Reservation): void {
    this.actionMessage.set('');
    this.actionError.set('');

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const nombrePlaces = this.editForm.controls.nombre_places.value;

    if (!Number.isInteger(nombrePlaces)) {
      this.actionError.set('Le nombre de places doit être un entier.');
      return;
    }

    this.actionId.set(reservation.id);

    this.reservationService
      .updateReservation(reservation.id, {
        nombre_places: nombrePlaces,
      })
      .pipe(
        finalize(() => {
          this.actionId.set(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.updateLocalReservation(reservation.id, response);

          this.editingId.set(null);
          this.actionMessage.set(response.message);
        },

        error: (error: HttpErrorResponse) => {
          this.actionError.set(
            this.getErrorMessage(error, 'Impossible de modifier la réservation.'),
          );
        },
      });
  }

  cancelReservation(reservation: Reservation): void {
    const confirmed = window.confirm(
      `Voulez-vous vraiment annuler la réservation de ${reservation.nombre_places} place(s) ?`,
    );

    if (!confirmed) {
      return;
    }

    this.actionMessage.set('');
    this.actionError.set('');
    this.actionId.set(reservation.id);

    this.reservationService
      .cancelReservation(reservation.id)
      .pipe(
        finalize(() => {
          this.actionId.set(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.updateLocalReservation(reservation.id, response);

          this.editingId.set(null);
          this.actionMessage.set(response.message);
        },

        error: (error: HttpErrorResponse) => {
          this.actionError.set(this.getErrorMessage(error, 'Impossible d’annuler la réservation.'));
        },
      });
  }

  canManage(reservation: Reservation): boolean {
    return (
      reservation.statut === 'confirmee' &&
      reservation.evenement !== undefined &&
      !this.isPast(reservation)
    );
  }

  isPast(reservation: Reservation): boolean {
    if (!reservation.evenement) {
      return true;
    }

    return new Date(reservation.evenement.date_evenement) <= new Date();
  }

  maximumPlaces(reservation: Reservation): number {
    return reservation.nombre_places + (reservation.evenement?.places_restantes ?? 0);
  }

  private updateLocalReservation(id: number, response: ReservationResponse): void {
    this.reservations.update((reservations) =>
      reservations.map((current) => {
        if (current.id !== id) {
          return current;
        }

        const evenement = current.evenement
          ? {
              ...current.evenement,
              places_restantes: response.places_restantes,
              places_occupees: current.evenement.places_totales - response.places_restantes,
            }
          : undefined;

        return {
          ...current,
          ...response.reservation,
          evenement,
        };
      }),
    );
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 0) {
      return 'Impossible de joindre le serveur.';
    }

    return error.error?.message ?? fallback;
  }
}
