import { Component, input } from '@angular/core';

// Indicador de pasos: resalta el activo y marca los anteriores como completados
@Component({
  selector: 'ui-stepper',
  templateUrl: './stepper.html',
  styleUrl: './stepper.scss',
})
export class Stepper {
  readonly steps = input.required<string[]>();
  readonly step = input.required<number>();
}
