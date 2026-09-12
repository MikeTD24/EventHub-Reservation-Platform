import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, Observable } from 'rxjs';

import { Categorie } from '../../../../core/models/categorie.model';
import { EvenementPayload, EvenementResponse } from '../../../../core/models/evenement.model';
import { CategorieService } from '../../../../core/services/categorie.service';
import { EvenementService } from '../../../../core/services/evenement.service';

@Component({
  selector: 'app-admin-event-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-event-form.html',
  styleUrl: './admin-event-form.scss',
})
export class AdminEventForm implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly categorieService = inject(CategorieService);
  private readonly evenementService = inject(EvenementService);

  readonly categories = signal<Categorie[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly placesOccupees = signal(0);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly submitError = signal('');

  readonly isEditMode = computed(() => this.editingId() !== null);

  /**
   * Lors d’une modification, la capacité ne peut jamais
   * devenir inférieure au nombre de places déjà réservées.
   */
  readonly minimumCapacity = computed(() => Math.max(1, this.placesOccupees()));

  readonly evenementForm = this.formBuilder.nonNullable.group({
    titre: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    lieu: ['', [Validators.required, Validators.maxLength(255)]],
    date_evenement: ['', Validators.required],
    places_totales: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    id_categorie: [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    const idParam = this.activatedRoute.snapshot.paramMap.get('id');

    if (idParam === null) {
      this.loadCreationData();
      return;
    }

    const id = Number(idParam);

    if (!Number.isInteger(id) || id < 1) {
      this.isLoading.set(false);
      this.errorMessage.set('L’identifiant de l’événement est invalide.');
      return;
    }

    this.editingId.set(id);
    this.loadEditingData(id);
  }

  /**
   * En création, seules les catégories sont nécessaires.
   */
  private loadCreationData(): void {
    this.categorieService
      .getCategories()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (categories) => {
          this.categories.set(this.sortCategories(categories));
        },

        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Impossible de charger les catégories.'),
          );
        },
      });
  }

  /**
   * En modification, les catégories et l’événement
   * sont chargés en parallèle.
   */
  private loadEditingData(id: number): void {
    forkJoin({
      categories: this.categorieService.getCategories(),
      evenement: this.evenementService.getEvenement(id),
    })
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: ({ categories, evenement }) => {
          this.categories.set(this.sortCategories(categories));

          this.placesOccupees.set(evenement.places_occupees);

          /*
           * Le minimum dynamique protège les réservations
           * déjà enregistrées pour cet événement.
           */
          this.evenementForm.controls.places_totales.setValidators([
            Validators.required,
            Validators.min(this.minimumCapacity()),
            Validators.pattern(/^\d+$/),
          ]);

          this.evenementForm.patchValue({
            titre: evenement.titre,
            description: evenement.description ?? '',
            lieu: evenement.lieu,
            date_evenement: this.toDateTimeLocal(evenement.date_evenement),
            places_totales: evenement.places_totales,
            id_categorie: evenement.id_categorie,
          });

          this.evenementForm.controls.places_totales.updateValueAndValidity();

          this.evenementForm.markAsPristine();
        },

        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getErrorMessage(error, 'Impossible de charger l’événement.'));
        },
      });
  }

  /**
   * Crée ou modifie l’événement selon l’URL courante.
   */
  submit(): void {
    this.submitError.set('');

    if (this.evenementForm.invalid) {
      this.evenementForm.markAllAsTouched();
      return;
    }

    const values = this.evenementForm.getRawValue();
    const placesTotales = Number(values.places_totales);
    const idCategorie = Number(values.id_categorie);
    const dateEvenement = new Date(values.date_evenement);

    if (
      !Number.isInteger(placesTotales) ||
      !Number.isInteger(idCategorie) ||
      Number.isNaN(dateEvenement.getTime())
    ) {
      this.submitError.set('Certaines données du formulaire sont invalides.');
      return;
    }

    const payload: EvenementPayload = {
      titre: values.titre.trim(),
      description: values.description.trim() || null,
      lieu: values.lieu.trim(),
      date_evenement: dateEvenement.toISOString(),
      places_totales: placesTotales,
      id_categorie: idCategorie,
    };

    const editingId = this.editingId();
    let request$: Observable<EvenementResponse>;

    if (editingId === null) {
      request$ = this.evenementService.createEvenement(payload);
    } else {
      request$ = this.evenementService.updateEvenement(editingId, payload);
    }

    this.isSubmitting.set(true);

    request$
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/admin/evenements']);
        },

        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            this.getErrorMessage(
              error,
              this.isEditMode()
                ? 'Impossible de modifier l’événement.'
                : 'Impossible de créer l’événement.',
            ),
          );
        },
      });
  }

  private toDateTimeLocal(value: string): string {
    const date = new Date(value);

    /*
     * datetime-local attend une heure locale sans fuseau.
     * Le décalage est retiré avant la conversion ISO.
     */
    const timezoneOffset = date.getTimezoneOffset() * 60_000;

    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  private sortCategories(categories: Categorie[]): Categorie[] {
    return [...categories].sort((first, second) =>
      first.nom.localeCompare(second.nom, 'fr', {
        sensitivity: 'base',
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
