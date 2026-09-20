import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Unit, UnitNode } from '../../../../core/units.api';
import { polyfillDialog } from '../../../../shared/ui/dialog/dialog.testing';
import { moveOptions, UnitTree } from './unit-tree';

const COMMUNITY: Unit = { id: 'c', parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos', isActive: true };
const TREE: UnitNode = {
  ...COMMUNITY,
  children: [
    {
      id: 'a', parentId: 'c', kind: 'building', code: 'A', name: 'Torre A', isActive: true,
      children: [{ id: 'a101', parentId: 'a', kind: 'apartment', code: '101', name: null, isActive: true, children: [] }],
    },
    { id: 'b', parentId: 'c', kind: 'building', code: 'B', name: null, isActive: false, children: [] },
  ],
};

describe('moveOptions', () => {
  it('should flatten the tree with indentation, skipping the moved unit and its subtree', () => {
    expect(moveOptions(TREE, 'a')).toEqual([
      { id: 'c', label: 'Los Álamos' },
      { id: 'b', label: '— Edificio B' },
    ]);
  });
});

describe('UnitTree', () => {
  let http: HttpTestingController;

  beforeAll(polyfillDialog);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UnitTree], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
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
    expect(rows()[3].textContent).toContain('inactiva');

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
});
