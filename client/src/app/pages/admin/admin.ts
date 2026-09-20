import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SECTIONS } from '../../core/sections';
import { Session } from '../../core/session';
import { Button, ThemeToggle } from '../../shared/ui';

// Layout del dashboard: header con las secciones que la persona puede ver, quién es, Salir y el outlet.
@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Button, ThemeToggle],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  protected readonly session = inject(Session);
  private readonly router = inject(Router);

  protected readonly sections = computed(() => SECTIONS.filter((s) => this.session.can(s.permission)));

  protected async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigateByUrl('/login');
  }
}
