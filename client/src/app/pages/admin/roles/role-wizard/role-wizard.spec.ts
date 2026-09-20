import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { RoleDetail } from '../../../../core/roles.api';
import { RoleWizard } from './role-wizard';

const CATALOG = [
  { key: 'units.read', resource: 'units', action: 'read', description: 'Ver unidades' },
  { key: 'units.write', resource: 'units', action: 'write', description: 'Crear y modificar unidades' },
  { key: 'users.read', resource: 'users', action: 'read', description: 'Ver usuarios' },
];
const ADMIN: RoleDetail = { id: 'r1', name: 'Administrador', description: 'Todo', isSystem: true, permissionCount: 3, userCount: 1, permissions: ['units.read', 'units.write', 'users.read'], users: [] };

describe('RoleWizard', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RoleWizard], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(role: RoleDetail | null = null) {
    const fixture = TestBed.createComponent(RoleWizard);
    fixture.componentRef.setInput('role', role);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/permissions')).flush(CATALOG);
    await fixture.whenStable();
    return fixture;
  }

  it('should create a role choosing permissions grouped by resource', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const next = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!;

    next().click();
    await fixture.whenStable();
    expect(next().disabled).toBe(true);
    const name = el.querySelector<HTMLInputElement>('[formControlName="name"]')!;
    name.value = 'Contador';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();

    expect([...el.querySelectorAll('.role-wizard__legend')].map((l) => l.textContent)).toEqual(['Unidades', 'Usuarios']);
    const boxes = el.querySelectorAll<HTMLInputElement>('.role-wizard__permission input');
    boxes[0].click();
    boxes[2].click();
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Unidades · Ver');
    expect(el.textContent).toContain('Usuarios · Ver');
    next().click();

    const post = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/roles'));
    expect(post.request.body).toEqual({ name: 'Contador', description: undefined, permissions: ['units.read', 'users.read'] });
    post.flush({ ...ADMIN, id: 'r9', name: 'Contador', isSystem: false, permissionCount: 2, userCount: 0 });
    await fixture.whenStable();
    expect(el.textContent).toContain('Rol creado');
    expect(el.textContent).toContain('2 permisos · 0 personas');
  });

  it('should keep the name of a system role read-only and PATCH only the changed permissions', async () => {
    const fixture = await render(ADMIN);
    const el = fixture.nativeElement as HTMLElement;
    const next = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!;

    expect(el.textContent).toContain('rol del sistema');
    next().click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLInputElement>('[formControlName="name"]')!.disabled).toBe(true);
    next().click();
    await fixture.whenStable();
    const boxes = el.querySelectorAll<HTMLInputElement>('.role-wizard__permission input');
    expect([...boxes].map((b) => b.checked)).toEqual([true, true, true]);
    boxes[1].click(); // quita units.write
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();
    next().click();

    const patch = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/roles/r1'));
    expect(patch.request.body).toEqual({ permissions: ['units.read', 'users.read'] });
    patch.flush({ message: 'Alguno de los permisos no existe' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(el.querySelector('.ui-form__error')?.textContent).toContain('no existe');
  });
});
