import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Card, type CardAction } from './card';

@Component({
  imports: [Card],
  template: `<ui-card heading="Proyecto">Contenido</ui-card>`,
})
class Host {}

@Component({
  imports: [Card],
  template: `<ui-card heading="Oferta" content="Descripción" [actions]="actions" (action)="last.set($event)" />`,
})
class ActionsHost {
  readonly actions: CardAction[] = [
    { id: 'view', label: 'Ver' },
    { id: 'withdraw', label: 'Retirar', variant: 'secondary', disabled: true },
  ];
  readonly last = signal<string | null>(null);
}

@Component({
  imports: [Card],
  template: `<ui-card heading="Postular" [steps]="['Datos', 'Carta', 'Confirmar']" [(step)]="step" [canAdvance]="canAdvance()" (finish)="finished.set(true)">Paso {{ step() }}</ui-card>`,
})
class WizardHost {
  readonly step = signal(0);
  readonly canAdvance = signal(true);
  readonly finished = signal(false);
}

@Component({
  imports: [Card],
  template: `<ui-card heading="Eliminar" [steps]="['Presentación', 'Confirmar']" [(step)]="step" finishVariant="danger" />`,
})
class DangerHost {
  readonly step = signal(0);
}

describe('Card', () => {
  it('should render the heading without a native title attribute', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const card = (fixture.nativeElement as HTMLElement).querySelector('ui-card')!;

    expect(card.querySelector('.ui-card__title')?.textContent).toBe('Proyecto');
    expect(card.hasAttribute('title')).toBe(false);
    expect(card.querySelector('.ui-card__actions')).toBeNull();
  });

  it('should render the content and emit the id of the clicked action', async () => {
    const fixture = TestBed.createComponent(ActionsHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.ui-card__content')?.textContent).toBe('Descripción');
    const buttons = el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button');
    expect(buttons).toHaveLength(2);
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[1].className).toContain('ui-button--secondary');

    buttons[0].click();
    expect(fixture.componentInstance.last()).toBe('view');
  });

  it('should navigate the steps and emit finish on the last one', async () => {
    const fixture = TestBed.createComponent(WizardHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button'));
    const labels = () => buttons().map((b) => b.textContent?.trim());

    expect(el.querySelectorAll('.ui-stepper__item')).toHaveLength(3);
    expect(labels()).toEqual(['Siguiente']);

    buttons()[0].click();
    await fixture.whenStable();
    expect(host.step()).toBe(1);
    expect(el.textContent).toContain('Paso 1');
    expect(labels()).toEqual(['Anterior', 'Siguiente']);

    buttons()[0].click();
    await fixture.whenStable();
    expect(host.step()).toBe(0);

    host.step.set(2);
    await fixture.whenStable();
    expect(labels()).toEqual(['Anterior', 'Finalizar']);

    buttons()[1].click();
    expect(host.finished()).toBe(true);
    expect(host.step()).toBe(2);

    host.canAdvance.set(false);
    await fixture.whenStable();
    expect(buttons()[1].disabled).toBe(true);
    expect(buttons()[0].disabled).toBe(false);
    expect(buttons()[0].closest('ui-button')?.className).toContain('ui-card__prev'); // Anterior a la izquierda
  });

  it('should paint Finalizar in danger only on the last step when finishVariant is danger', async () => {
    const fixture = TestBed.createComponent(DangerHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const main = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!;

    expect(main().className).toContain('ui-button--primary');
    fixture.componentInstance.step.set(1);
    await fixture.whenStable();
    expect(main().textContent).toContain('Finalizar');
    expect(main().className).toContain('ui-button--danger');
  });
});
