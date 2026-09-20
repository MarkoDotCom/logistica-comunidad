import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Stepper } from './stepper';

@Component({
  imports: [Stepper],
  template: `<ui-stepper [steps]="['Datos', 'Carta', 'Confirmar']" [step]="1" />`,
})
class Host {}

describe('Stepper', () => {
  it('should mark previous steps as done and the current one as active', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.ui-stepper__item');

    expect(items).toHaveLength(3);
    expect(items[0].className).toContain('ui-stepper__item--done');
    expect(items[0].querySelector('.ui-stepper__marker')?.textContent).toBe('✓');
    expect(items[1].className).toContain('ui-stepper__item--active');
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[2].querySelector('.ui-stepper__marker')?.textContent).toBe('3');
  });
});
