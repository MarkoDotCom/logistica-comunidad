import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { UnitNode } from '../../../../core/units.api';
import { countAlive, RemoveUnit } from './remove-unit';

const TOWER: UnitNode = {
  id: 'a', parentId: 'c', kind: 'building', code: 'A', name: 'Torre A', deletedAt: null,
  children: [
    { id: 'a101', parentId: 'a', kind: 'apartment', code: '101', name: null, deletedAt: null, children: [] },
    { id: 'a102', parentId: 'a', kind: 'apartment', code: '102', name: null, deletedAt: null, children: [] },
  ],
};

describe('countAlive', () => {
  it('should count the root and its alive descendants', () => {
    expect(countAlive(TOWER)).toBe(3);
  });
});

describe('RemoveUnit', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RemoveUnit], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should explain the cascade, finish with a danger button, DELETE and show the result', async () => {
    const fixture = TestBed.createComponent(RemoveUnit);
    fixture.componentRef.setInput('node', TOWER);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button'));
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    expect(el.textContent).toContain('Vas a eliminar Torre A');
    expect(el.textContent).toContain('las 2 unidades que cuelgan');
    expect(buttons().at(-1)!.className).toContain('ui-button--primary'); // Siguiente no cambia
    buttons().at(-1)!.click();
    await fixture.whenStable();

    expect(buttons().at(-1)!.textContent).toContain('Finalizar');
    expect(buttons().at(-1)!.className).toContain('ui-button--danger');
    buttons().at(-1)!.click();
    http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/units/a')).flush({ deleted: 3 });
    await fixture.whenStable();

    expect(el.textContent).toContain('Unidad eliminada');
    expect(el.textContent).toContain('Se eliminaron 3 unidades');
    buttons()[0].click();
    expect(closed).toBe(true);
  });

  it('should show the API error and keep the wizard open', async () => {
    const fixture = TestBed.createComponent(RemoveUnit);
    fixture.componentRef.setInput('node', { ...TOWER, children: [] });
    fixture.componentInstance['step'].set(1);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!.click();
    http.expectOne((r) => r.method === 'DELETE').flush({ message: 'Unidad no encontrada' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(el.querySelector('.ui-form__error')?.textContent).toContain('Unidad no encontrada');
    expect(el.textContent).not.toContain('Unidad eliminada');
  });
});
