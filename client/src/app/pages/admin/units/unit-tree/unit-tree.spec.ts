import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ALL_PERMISSIONS, provideSessionWith } from '../../../../core/session.testing';
import type { Unit, UnitNode } from '../../../../core/units.api';
import { polyfillDialog } from '../../../../shared/ui/dialog/dialog.testing';
import { moveOptions, UnitTree } from './unit-tree';

const COMMUNITY: Unit = { id: 'c', parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos', deletedAt: null };
const TREE: UnitNode = {
  ...COMMUNITY,
  children: [
    {
      id: 'a', parentId: 'c', kind: 'building', code: 'A', name: 'Torre A', deletedAt: null,
      children: [{ id: 'a101', parentId: 'a', kind: 'apartment', code: '101', name: null, deletedAt: null, children: [] }],
    },
    { id: 'b', parentId: 'c', kind: 'building', code: 'B', name: null, deletedAt: '2026-09-01T00:00:00.000Z', children: [] },
  ],
};

describe('moveOptions', () => {
  it('should offer only higher-rank units, skipping the moved unit and its subtree', () => {
    // Un edificio solo puede colgar de la comunidad (no de otro edificio)
    expect(moveOptions(TREE, 'a', 'building')).toEqual([{ id: 'c', label: 'Los Álamos' }]);
    // Un departamento puede colgar de la comunidad o de un edificio
    expect(moveOptions(TREE, 'a101', 'apartment')).toEqual([
      { id: 'c', label: 'Los Álamos' },
      { id: 'a', label: '— Torre A' },
      { id: 'b', label: '— Edificio B' },
    ]);
  });
});

describe('UnitTree', () => {
  let http: HttpTestingController;

  beforeAll(polyfillDialog);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UnitTree], providers: [provideSessionWith(ALL_PERMISSIONS), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render() {
    const fixture = TestBed.createComponent(UnitTree);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units')).flush([COMMUNITY]);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units/c/tree')).flush(TREE);
    await fixture.whenStable();
    return fixture;
  }

  it('should render the tree of each community and collapse a node', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const rows = () => el.querySelectorAll('.unit-node__row');

    expect(rows()).toHaveLength(4);
    expect(rows()[0].textContent).toContain('Los Álamos');
    expect(rows()[2].textContent).toContain('Departamento 101');
    expect(rows()[3].textContent).toContain('eliminada');
    expect(rows()[3].querySelectorAll('.unit-node__actions button')).toHaveLength(1); // solo Restaurar

    rows()[1].querySelector<HTMLButtonElement>('.unit-node__toggle')!.click();
    await fixture.whenStable();
    expect(rows()).toHaveLength(3);
  });

  it('should open the new-unit wizard for a child and the edit wizard with move options', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const rowButtons = (i: number) => el.querySelectorAll('.unit-node__row')[i].querySelectorAll<HTMLButtonElement>('.unit-node__actions button');

    rowButtons(1)[0].click(); // + Hijo de Torre A
    await fixture.whenStable();
    expect(el.querySelector('app-new-unit')!.textContent).toContain('Torre A');

    el.querySelector<HTMLDialogElement>('dialog')!.querySelector<HTMLButtonElement>('.ui-dialog__close')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units')).flush([COMMUNITY]);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units/c/tree')).flush(TREE);
    await fixture.whenStable();

    rowButtons(2)[1].click(); // Modificar Departamento 101
    await fixture.whenStable();
    const edit = el.querySelector('app-edit-unit')!;
    expect(edit.textContent).toContain('Vas a modificar Departamento 101');
    Array.from(edit.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!.click(); // Siguiente → Datos
    await fixture.whenStable();
    const options = [...el.querySelectorAll<HTMLOptionElement>('app-edit-unit [formControlName="parentId"] option')].map((o) => o.textContent?.trim());
    expect(options).toEqual(['Los Álamos', '— Torre A', '— Edificio B']);
  });

  it('should open the remove wizard with the subtree size, DELETE on finish and reload when closed', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const rowButtons = (i: number) => el.querySelectorAll('.unit-node__row')[i].querySelectorAll<HTMLButtonElement>('.unit-node__actions button');

    rowButtons(1)[2].click(); // Eliminar Torre A
    await fixture.whenStable();
    const wizard = el.querySelector('app-remove-unit')!;
    expect(wizard.textContent).toContain('Vas a eliminar Torre A');
    expect(wizard.textContent).toContain('Se elimina también la unidad que cuelga');
    const next = () => Array.from(wizard.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!;
    next().click();
    await fixture.whenStable();
    expect(next().className).toContain('ui-button--danger');
    next().click();
    http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/units/a')).flush({ deleted: 2 });
    await fixture.whenStable();
    expect(wizard.textContent).toContain('Unidad eliminada');

    wizard.querySelector<HTMLButtonElement>('.ui-card__actions button')!.click(); // Cerrar → recarga
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units')).flush([COMMUNITY]);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units/c/tree')).flush({ ...TREE, children: [TREE.children[1]] });
    await fixture.whenStable();
    expect(el.querySelectorAll('.unit-node__row')).toHaveLength(2);
  });

  it('should reload with includeDeleted when the checkbox is on and open the restore wizard', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLInputElement>('.unit-tree__toolbar input[type="checkbox"]')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units')).flush([COMMUNITY]);
    await fixture.whenStable();
    http.expectOne((r) => r.urlWithParams.endsWith('/units/c/tree?includeDeleted=true')).flush(TREE);
    await fixture.whenStable();

    el.querySelectorAll('.unit-node__row')[3].querySelector<HTMLButtonElement>('.unit-node__actions button')!.click(); // Restaurar Edificio B
    await fixture.whenStable();
    const wizard = el.querySelector('app-restore-unit')!;
    expect(wizard.textContent).toContain('Vas a restaurar Edificio B');

    // Al cerrar el wizard se recarga el árbol, manteniendo "Mostrar eliminadas"
    el.querySelectorAll<HTMLDialogElement>('dialog')[3].querySelector<HTMLButtonElement>('.ui-dialog__close')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units')).flush([COMMUNITY]);
    await fixture.whenStable();
    http.expectOne((r) => r.urlWithParams.endsWith('/units/c/tree?includeDeleted=true')).flush(TREE);
    await fixture.whenStable();
    expect(el.querySelector('app-restore-unit')).toBeNull();
  });
});
