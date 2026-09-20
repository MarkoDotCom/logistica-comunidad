import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ALL_PERMISSIONS, provideSessionWith } from '../../../../core/session.testing';
import { provideRouter } from '@angular/router';
import { polyfillDialog } from '../../../../shared/ui/dialog/dialog.testing';
import { RoleDetail } from './role-detail';

const ROLE = {
  id: 'r2', name: 'Conserje', description: 'Ve y no toca', isSystem: false, permissionCount: 2, userCount: 1,
  permissions: ['units.read', 'users.read'],
  users: [{ id: 'u5', fullName: 'Diego Pérez', email: 'conserje@losalamos.example.com' }],
};

describe('RoleDetail', () => {
  let http: HttpTestingController;

  beforeAll(polyfillDialog);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RoleDetail], providers: [provideSessionWith(ALL_PERMISSIONS), provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should show permissions as labels and the people, and open the remove-user wizard', async () => {
    const fixture = TestBed.createComponent(RoleDetail);
    fixture.componentRef.setInput('id', 'r2');
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/roles/r2')).flush(ROLE);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect([...el.querySelectorAll('.detail__tags ui-tag')].map((t) => t.textContent?.trim())).toEqual(['Unidades · Ver', 'Usuarios · Ver']);
    expect(el.querySelector('tbody tr')?.textContent).toContain('Diego Pérez');

    el.querySelector<HTMLButtonElement>('tbody .ui-table__actions button')!.click();
    await fixture.whenStable();
    expect(el.querySelector('app-remove-role-user')?.textContent).toContain('quitar el rol Conserje a Diego Pérez');

    // Al cerrar se recarga el detalle
    el.querySelectorAll<HTMLDialogElement>('dialog')[2].querySelector<HTMLButtonElement>('.ui-dialog__close')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/roles/r2')).flush({ ...ROLE, users: [], userCount: 0 });
    await fixture.whenStable();
    expect(el.textContent).toContain('Nadie tiene este rol todavía');
  });
});
