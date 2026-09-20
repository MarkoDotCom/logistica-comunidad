import { Component, computed, input, model, output } from '@angular/core';
import { Button } from '../button/button';
import { Stepper } from '../stepper/stepper';

export interface CardAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
}

@Component({
  selector: 'ui-card',
  imports: [Button, Stepper],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  readonly heading = input<string>();
  readonly content = input<string>();
  readonly actions = input<CardAction[]>([]);

  // Modo wizard: con steps el card muestra el ui-stepper y los botones Anterior / Siguiente / Finalizar
  readonly steps = input<string[]>([]);
  readonly step = model(0);
  /** En false deshabilita Siguiente / Finalizar (p. ej. paso con errores de validación). */
  readonly canAdvance = input(true);
  /** Finalizar en rojo cuando el wizard elimina o da de baja; Siguiente nunca cambia. */
  readonly finishVariant = input<'primary' | 'danger'>('primary');

  readonly action = output<string>();
  readonly finish = output<void>();

  protected readonly isLastStep = computed(() => this.step() >= this.steps().length - 1);

  protected prev(): void {
    this.step.update((s) => s - 1);
  }

  protected next(): void {
    if (this.isLastStep()) {
      this.finish.emit();
    } else {
      this.step.update((s) => s + 1);
    }
  }
}
