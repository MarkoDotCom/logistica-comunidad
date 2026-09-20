import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ALL_PERMISSIONS, provideSessionWith } from '../../../../core/session.testing';
import { provideRouter } from '@angular/router';
import { polyfillDialog } from '../../../../shared/ui/dialog/dialog.testing';
import { RoleList } from './role-list';

const ROLES = [
  { id: 'r1', name: 'Administrador', description: 'Todo', isSystem: true, permissionCount: 10, userCount: 1 },
  { id: 'r2', name: 'Conserje', description: null, isSystem: false, permissionCount: 4, userCount: 1 },
];

describe('RoleList', () => {
  let http: HttpTestingController;

  beforeAll(polyfillDialog);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RoleList], providers: [provideSessionWith(ALL_PERMISSIONS), provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list roles, hide Eliminar on system roles and open the edit wizard with the detail', async () => {
    const fixture = TestBed.createComponent(RoleList);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/roles')).flush(ROLES);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('tbody tr');

    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Sistema');
    expect([...rows[0].querySelectorAll('.ui-table__actions button')].map((b) => b.textContent?.trim())).toEqual(['Modificar']);
    expect([...rows[1].querySelectorAll('.ui-table__actions button')].map((b) => b.textContent?.trim())).toEqual(['Modificar', 'Eliminar']);
    expect(rows[1].querySelector('a')?.getAttribute('href')).toBe('/admin/roles/r2');

    rows[1].querySelector<HTMLButtonElement>('.ui-table__actions button')!.click();
    http.expectOne((r) => r.url.endsWith('/roles/r2')).flush({ ...ROLES[1], permissions: ['units.read'], users: [] });
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/permissions')).flush([]);
    await fixture.whenStable();
    expect(el.querySelector('app-role-wizard')?.textContent).toContain('Vas a modificar el rol Conserje');
  });
});
