import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly registrationSucceeded =
    this.activatedRoute.snapshot.queryParamMap.get('inscription') === 'succes';

  readonly sessionExpired = this.activatedRoute.snapshot.queryParamMap.get('session') === 'expiree';

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    mot_de_passe: ['', Validators.required],
  });

  submit(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.authService
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          const returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl');

          // Accepte uniquement une route interne à l’application.
          const destination =
            returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/evenements';

          void this.router.navigateByUrl(destination);
        },

        error: (error: HttpErrorResponse) => {
          if (error.status === 0) {
            this.errorMessage.set('Impossible de joindre le serveur.');
            return;
          }

          this.errorMessage.set(
            error.error?.message ?? 'Une erreur est survenue pendant la connexion.',
          );
        },
      });
  }
}
