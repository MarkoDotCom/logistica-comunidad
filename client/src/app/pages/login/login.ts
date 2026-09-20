import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { apiErrorMessage } from '../../core/labels';
import { Session } from '../../core/session';
import { Button, Card, ThemeToggle } from '../../shared/ui';

// Página pública: email y contraseña. Tras entrar, va a returnUrl o a la primera sección permitida.
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Button, Card, ThemeToggle],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.session.login(email.trim(), password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl && returnUrl !== '/login' ? returnUrl : (this.session.firstAllowed() ?? '/admin/sin-acceso'));
    } catch (e) {
      this.error.set(apiErrorMessage(e as HttpErrorResponse, 'No se pudo iniciar sesión'));
    } finally {
      this.saving.set(false);
    }
  }
}
