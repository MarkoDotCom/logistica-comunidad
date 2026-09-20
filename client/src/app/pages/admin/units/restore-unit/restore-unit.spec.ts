import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { UnitNode } from '../../../../core/units.api';
import { countDeletedWith, RestoreUnit } from './restore-unit';

const AT = '2026-09-01T10:00:00.000Z';
const TOWER: UnitNode = {
  id: 'a', parentId: 'c', kind: 'building', code: 'A', name: 'Torre A', deletedAt: AT,
  children: [
    { id: 'a101', parentId: 'a', kind: 'apartment', code: '101', name: null, deletedAt: AT, children: [] },
    { id: 'a102', parentId: 'a', kind: 'apartment', code: '102', name: null, deletedAt: '2026-08-01T00:00:00.000Z', children: [] }, // eliminada antes, aparte
  ],
};

describe('countDeletedWith', () => {
  it('should count only the units deleted in the same operation', () => {
    expect(countDeletedWith(TOWER)).toBe(2);
  });
});

describe('RestoreUnit', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RestoreUnit], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render() {
    const fixture = TestBed.createComponent(RestoreUnit);
    fixture.componentRef.setInput('node', TOWER);
    await fixture.whenStable();
    return fixture;
  }

  it('should explain what comes back, POST the restore and show the result', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button'));
    const next = () => buttons().at(-1)!;
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    expect(el.textContent).toContain('Vas a restaurar Torre A');
    expect(el.textContent).toContain('Vuelve también la unidad que se eliminó con ella');
    expect(el.textContent).toContain('«A»');
    next().click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Vuelven con ella');
    expect(next().textContent).toContain('Finalizar');
    next().click();

    http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/units/a/restore')).flush({ ...TOWER, deletedAt: null });
    await fixture.whenStable();
    expect(el.textContent).toContain('Unidad restaurada');
    buttons()[0].click();
    expect(closed).toBe(true);
  });

  it('should show the API error and keep the wizard open', async () => {
    const fixture = await render();
    fixture.componentInstance['step'].set(1);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!.click();
    http.expectOne((r) => r.method === 'POST').flush({ message: 'La unidad padre está eliminada; restaúrala primero' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(el.querySelector('.ui-form__error')?.textContent).toContain('restaúrala primero');
    expect(el.textContent).not.toContain('Unidad restaurada');
  });
});
