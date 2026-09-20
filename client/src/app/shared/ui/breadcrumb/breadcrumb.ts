import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: unknown[]; // sin link = el ítem actual
}

// Ruta de navegación: los ítems con link son enlaces; el último, el actual, va como texto con aria-current
@Component({
  selector: 'ui-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
})
export class Breadcrumb {
  readonly items = input.required<BreadcrumbItem[]>();
}
