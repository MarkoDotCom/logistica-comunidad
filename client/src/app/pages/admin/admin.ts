import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeToggle } from '../../shared/ui';

// Layout del dashboard: header con las secciones y el outlet.
// Público por ahora; se protegerá cuando exista autenticación.
@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {}
