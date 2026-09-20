import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ALL_PERMISSIONS, provideSessionWith } from '../../../../core/session.testing';
import { provideRouter } from '@angular/router';
import type { Unit } from '../../../../core/units.api';
import { polyfillDialog } from '../../../../shared/ui/dialog/dialog.testing';
import { UnitLevel } from './unit-level';

const COMMUNITY: Unit = { id: 'c', parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos', deletedAt: null };
const BUILDINGS = [
  { id: 'a', parentId: 'c', kind: 'building', code: 'A', name: 'Torre A', deletedAt: null, childrenCount: 2 },
  { id: 'b', parentId: 'c', kind: 'building', code: 'B', name: null, deletedAt: '2026-09-01T00:00:00.000Z', childrenCount: 0 },
];

describe('UnitLevel', () => {
  let http: HttpTestingController;

  beforeAll(polyfillDialog);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UnitLevel], providers: [provideSessionWith(ALL_PERMISSIONS), provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render() {
    const fixture = TestBed.createComponent(UnitLevel);
    fixture.componentRef.setInput('parent', COMMUNITY);
    fixture.componentRef.setInput('childKind', 'building');
    fixture.componentRef.setInput('linkFor', (u: Unit) => ['/admin/comunidades', 'c', 'edificios', u.id]);
    await fixture.whenStable();
    http.expectOne((r) => r.urlWithParams.endsWith('/units?parentId=c')).flush([BUILDINGS[0]]);
    await fixture.whenStable();
    return fixture;
  }

  it('should list the children with their count, a link and the alta button for the child kind', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.unit-level__toolbar button')?.textContent).toContain('Nuevo edificio');
    expect([...el.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Tipo', 'Código', 'Nombre', 'Departamentos', 'Estado', '']);
    const row = el.querySelector('tbody tr')!;
    expect(row.textContent).toContain('Torre A');
    expect(row.textContent).toContain('2');
    expect(row.querySelector('a.unit-level__link')?.getAttribute('href')).toBe('/admin/comunidades/c/edificios/a');
    expect([...row.querySelectorAll('.ui-table__actions button')].map((b) => b.textContent?.trim())).toEqual(['Modificar', 'Eliminar']);
  });

  it('should reload including deleted ones and open the restore wizard with the subtree', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLInputElement>('.unit-level__toolbar input')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.urlWithParams.endsWith('/units?parentId=c&includeDeleted=true')).flush(BUILDINGS);
    await fixture.whenStable();
    const rows = el.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('Eliminada');

    rows[1].querySelector<HTMLButtonElement>('.ui-table__actions button')!.click(); // Restaurar
    http.expectOne((r) => r.urlWithParams.endsWith('/units/b/tree?includeDeleted=true')).flush({ ...BUILDINGS[1], children: [] });
    await fixture.whenStable();
    expect(el.querySelector('app-restore-unit')?.textContent).toContain('Vas a restaurar Edificio B');
  });

  it('should open the new-unit wizard for the parent and the edit wizard for a row', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('.unit-level__toolbar button')!.click();
    await fixture.whenStable();
    expect(el.querySelector('app-new-unit')?.textContent).toContain('dentro de Los Álamos');

    el.querySelectorAll<HTMLDialogElement>('dialog')[0].querySelector<HTMLButtonElement>('.ui-dialog__close')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.urlWithParams.endsWith('/units?parentId=c')).flush([BUILDINGS[0]]);
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('tbody .ui-table__actions button')!.click(); // Modificar
    await fixture.whenStable();
    expect(el.querySelector('app-edit-unit')?.textContent).toContain('Vas a modificar Torre A');
  });

  it('should fetch the alive subtree and open the remove wizard', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelectorAll<HTMLButtonElement>('tbody .ui-table__actions button')[1].click(); // Eliminar
    http.expectOne((r) => r.urlWithParams.endsWith('/units/a/tree')).flush({ ...BUILDINGS[0], children: [] });
    await fixture.whenStable();
    expect(el.querySelector('app-remove-unit')?.textContent).toContain('Vas a eliminar Torre A');
  });

  it('should hide every action for a person who can only read', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [UnitLevel], providers: [provideSessionWith(['units.read']), provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.unit-level__toolbar')).toBeNull();
    expect(el.querySelectorAll('tbody .ui-table__actions button')).toHaveLength(0);
    expect(el.querySelector('tbody .unit-level__open')).not.toBeNull(); // Abrir sigue disponible
  });
});
