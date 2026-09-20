import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SummaryApi, type Summary } from '../../../core/summary.api';
import { Card, type CardAction, SectionHeader } from '../../../shared/ui';

interface Metric {
  label: string;
  value: number;
  hint?: string;
  link: string;
}

@Component({
  selector: 'app-home',
  imports: [DecimalPipe, RouterLink, Card, SectionHeader],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly api = inject(SummaryApi);
  private readonly router = inject(Router);

  protected readonly summary = signal<Summary | null>(null);
  protected readonly failed = signal(false);
  protected readonly goActions: CardAction[] = [{ id: 'go', label: 'Abrir', variant: 'secondary' }];

  protected readonly metrics = computed<Metric[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Comunidades', value: s.units.community, link: '/admin/comunidades' },
      { label: 'Edificios', value: s.units.building, link: '/admin/unidades' },
      { label: 'Departamentos', value: s.units.apartment, link: '/admin/unidades' },
      { label: 'Cuentas', value: s.units.account, link: '/admin/unidades' },
      { label: 'Usuarios activos', value: s.users.active, hint: `de ${s.users.total} en total`, link: '/admin/usuarios' },
      { label: 'Contratos vigentes', value: s.contracts.current, hint: `${s.contracts.endingSoon} vencen en 30 días`, link: '/admin/usuarios' },
    ];
  });

  constructor() {
    this.api.get().subscribe({ next: (s) => this.summary.set(s), error: () => this.failed.set(true) });
  }

  protected go(url: string): void {
    void this.router.navigateByUrl(url);
  }
}
