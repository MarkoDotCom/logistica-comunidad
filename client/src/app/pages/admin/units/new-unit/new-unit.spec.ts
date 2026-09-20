import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NewUnit } from './new-unit';

const TOWER = { id: 'a', parentId: 'c', kind: 'building' as const, code: 'A', name: 'Torre A', deletedAt: null };

describe('NewUnit', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NewUnit], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(parent: object | null) {
    const fixture = TestBed.createComponent(NewUnit);
    fixture.componentRef.setInput('parent', parent);
    await fixture.whenStable();
    return fixture;
  }

  it('should suggest the child kind from the parent and POST with parentId', async () => {
    const fixture = await render(TOWER);
    const el = fixture.nativeElement as HTMLElement;
    const next = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!;

    expect(el.textContent).toContain('dentro de Torre A');
    next().click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLSelectElement>('[formControlName="kind"]')!.value).toBe('apartment');

    const code = el.querySelector<HTMLInputElement>('[formControlName="code"]')!;
    code.value = ' 103 ';
    code.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();
    next().click();

    const post = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/units'));
    expect(post.request.body).toEqual({ kind: 'apartment', code: '103', name: undefined, parentId: 'a' });
    post.flush({ id: 'n', parentId: 'a', kind: 'apartment', code: '103', name: null, deletedAt: null });
    await fixture.whenStable();
    expect(el.textContent).toContain('Unidad creada');
    expect(el.textContent).toContain('Cuelga de Torre A');
  });

  it('should create a root community without a kind selector', async () => {
    const fixture = await render(null);
    const el = fixture.nativeElement as HTMLElement;

    fixture.componentInstance['form'].patchValue({ code: 'nueva', name: 'Nueva' });
    fixture.componentInstance['step'].set(2);
    await fixture.whenStable();
    expect(el.textContent).toContain('Comunidad');
    Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!.click();

    const post = http.expectOne((r) => r.method === 'POST');
    expect(post.request.body).toEqual({ kind: 'community', code: 'nueva', name: 'Nueva', parentId: undefined });
    post.flush({ message: 'Ya existe una unidad con ese código en el mismo nivel' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(el.querySelector('.ui-form__error')?.textContent).toContain('mismo nivel');
  });

  it('should offer only kinds below the parent and block children under an account', async () => {
    const fixture = await render({ id: 'a101', parentId: 'a', kind: 'apartment', code: '101', name: null, deletedAt: null });
    const el = fixture.nativeElement as HTMLElement;
    fixture.componentInstance['step'].set(1);
    await fixture.whenStable();
    expect([...el.querySelectorAll<HTMLOptionElement>('[formControlName="kind"] option')].map((o) => o.value)).toEqual(['account']);

    const blocked = TestBed.createComponent(NewUnit);
    blocked.componentRef.setInput('parent', { id: 'gc', parentId: 'a101', kind: 'account', code: 'GC', name: null, deletedAt: null });
    await blocked.whenStable();
    const bel = blocked.nativeElement as HTMLElement;
    expect(bel.textContent).toContain('Una cuenta no puede tener unidades dentro');
    expect(bel.querySelector<HTMLButtonElement>('.ui-card__actions button')!.disabled).toBe(true);
  });
});
