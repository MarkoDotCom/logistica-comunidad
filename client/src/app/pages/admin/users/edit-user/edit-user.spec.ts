import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EditUser } from './edit-user';

const ROLES = [
  { id: 'r2', name: 'Conserje', description: null, isSystem: false, permissionCount: 4, userCount: 1 },
  { id: 'r3', name: 'Residente', description: 'Ve lo suyo', isSystem: false, permissionCount: 2, userCount: 3 },
];

const ANA = {
  id: 'u1', email: 'ana@example.com', externalAuthId: null, fullName: 'Ana Rojas', phone: null, isActive: true, roles: [{ id: 'r3', name: 'Residente' }],
  contracts: [{ id: 'k1', type: 'ownership', startsAt: '2019-06-15', endsAt: null, unit: { id: 'a101', kind: 'apartment', code: '101', name: null } }],
};

describe('EditUser', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EditUser], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render() {
    const fixture = TestBed.createComponent(EditUser);
    fixture.componentRef.setInput('userId', 'u1');
    await fixture.whenStable();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/users/u1')).flush(ANA);
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/roles')).flush(ROLES);
    await fixture.whenStable();
    return fixture;
  }

  it('should show the contracts, prefill the form and PATCH the changes', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button'));
    const next = () => buttons().at(-1)!;
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    expect(el.textContent).toContain('Vas a modificar a Ana Rojas');
    expect(el.textContent).toContain('Propiedad');
    expect(el.textContent).toContain('Departamento 101');
    next().click();
    await fixture.whenStable();

    expect(el.querySelector<HTMLInputElement>('[formControlName="fullName"]')!.value).toBe('Ana Rojas');
    const phone = el.querySelector<HTMLInputElement>('[formControlName="phone"]')!;
    phone.value = '+56 9 1111 1111';
    phone.dispatchEvent(new Event('input'));
    el.querySelector<HTMLInputElement>('[formControlName="isActive"]')!.click();
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();

    // Paso Roles: Residente viene marcado; se agrega Conserje
    const boxes = el.querySelectorAll<HTMLInputElement>('.edit-user__role input');
    expect([...boxes].map((b) => b.checked)).toEqual([false, true]);
    boxes[0].click();
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();

    expect(el.textContent).toContain('Inactivo');
    expect(el.textContent).toContain('Conserje, Residente');
    next().click();
    const patch = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/users/u1'));
    expect(patch.request.body).toEqual({ fullName: 'Ana Rojas', email: 'ana@example.com', phone: '+56 9 1111 1111', isActive: false, roleIds: ['r3', 'r2'] });
    patch.flush({ ...ANA, phone: '+56 9 1111 1111', isActive: false });
    await fixture.whenStable();

    expect(el.textContent).toContain('Usuario actualizado');
    buttons()[0].click();
    expect(closed).toBe(true);
  });

  it('should show the API error and keep the wizard open', async () => {
    const fixture = await render();
    fixture.componentInstance['form'].patchValue({ email: 'otra@example.com' }); // sin un cambio real no se puede finalizar
    fixture.componentInstance['step'].set(3);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!.click();
    http.expectOne((r) => r.method === 'PATCH').flush({ message: 'Ya existe un usuario con ese email' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(el.querySelector('.ui-form__error')?.textContent).toContain('Ya existe un usuario con ese email');
    expect(el.textContent).not.toContain('Usuario actualizado');
  });
});
