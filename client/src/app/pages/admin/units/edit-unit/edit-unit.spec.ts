import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EditUnit } from './edit-unit';

const APT = { id: 'a101', parentId: 'a', kind: 'apartment' as const, code: '101', name: null, isActive: true };
const OPTIONS = [{ id: 'c', label: 'Los Álamos' }, { id: 'a', label: '— Torre A' }, { id: 'b', label: '— Torre B' }];

describe('EditUnit', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EditUnit], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(unit: object, options = OPTIONS) {
    const fixture = TestBed.createComponent(EditUnit);
    fixture.componentRef.setInput('unit', unit);
    fixture.componentRef.setInput('moveOptions', options);
    await fixture.whenStable();
    return fixture;
  }

  it('should PATCH only the changed fields, including the new parent', async () => {
    const fixture = await render(APT);
    const el = fixture.nativeElement as HTMLElement;
    const next = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!;

    next().click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLSelectElement>('[formControlName="parentId"]')!.value).toBe('a');
    fixture.componentInstance['form'].patchValue({ parentId: 'b', name: 'Depto 101' });
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();
    expect(el.textContent).toContain('— Torre B');
    next().click();

    const patch = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/units/a101'));
    expect(patch.request.body).toEqual({ name: 'Depto 101', parentId: 'b' });
    patch.flush({ ...APT, parentId: 'b', name: 'Depto 101' });
    await fixture.whenStable();
    expect(el.textContent).toContain('Unidad actualizada');
  });

  it('should hide kind and parent for a community and show the API error', async () => {
    const fixture = await render({ id: 'c', parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos', isActive: true }, []);
    const el = fixture.nativeElement as HTMLElement;

    fixture.componentInstance['step'].set(1);
    await fixture.whenStable();
    expect(el.querySelector('[formControlName="kind"]')).toBeNull();
    expect(el.querySelector('[formControlName="parentId"]')).toBeNull();

    fixture.componentInstance['form'].patchValue({ code: 'A' });
    fixture.componentInstance['step'].set(2);
    await fixture.whenStable();
    Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!.click();

    const patch = http.expectOne((r) => r.method === 'PATCH');
    expect(patch.request.body).toEqual({ code: 'A' });
    patch.flush({ message: 'Ya existe una unidad con ese código en el mismo nivel' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(el.querySelector('.ui-form__error')?.textContent).toContain('mismo nivel');
  });
});
