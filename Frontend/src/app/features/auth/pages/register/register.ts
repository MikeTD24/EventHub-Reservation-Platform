import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mot_de_passe: ['', [Validators.required, Validators.minLength(8)]],
    confirmation_mot_de_passe: ['', Validators.required],
  });

  passwordsDifferent(): boolean {
    return (
      this.form.controls.mot_de_passe.value !== this.form.controls.confirmation_mot_de_passe.value
    );
  }

  submit(): void {
    this.errorMessage.set('');

    if (this.form.invalid || this.passwordsDifferent()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const values = this.form.getRawValue();

    const payload = {
      nom: values.nom.trim(),
      email: values.email.trim(),
      mot_de_passe: values.mot_de_passe,
    };

    this.authService
      .register(payload)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/connexion'], {
            queryParams: {
              inscription: 'succes',
            },
          });
        },

        error: (error: HttpErrorResponse) => {
          if (error.status === 0) {
            this.errorMessage.set('Impossible de joindre le serveur.');
            return;
          }

          this.errorMessage.set(
            error.error?.message ?? 'Une erreur est survenue pendant l’inscription.',
          );
        },
      });
  }
}
