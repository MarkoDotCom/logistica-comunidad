import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { polyfillDialog } from '../../../../shared/ui/dialog/dialog.testing';
import { UserList } from './user-list';

const USERS = [
  { id: 'u1', email: 'ana.rojas@example.com', externalAuthId: null, fullName: 'Ana Rojas', phone: '+56 9 2222 2222', isActive: true, roles: [{ id: 'r3', name: 'Residente' }] },
  { id: 'u2', email: 'bruno.diaz@example.com', externalAuthId: null, fullName: 'Bruno Díaz', phone: null, isActive: false, roles: [] },
];

describe('UserList', () => {
  let http: HttpTestingController;

  beforeAll(polyfillDialog);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render() {
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/users')).flush(USERS);
    await fixture.whenStable();
    return fixture;
  }

  it('should render one row per user and filter locally by name or email', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const rows = () => el.querySelectorAll('tbody tr');

    expect(rows()).toHaveLength(2);
    expect(rows()[0].textContent).toContain('Activo');
    expect(rows()[0].textContent).toContain('Residente');
    expect(rows()[1].textContent).toContain('Inactivo');
    expect(rows()[1].textContent).toContain('—');

    const search = el.querySelector<HTMLInputElement>('.user-list__search')!;
    search.value = 'bruno';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Bruno Díaz');

    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.textContent).toContain('Ningún usuario coincide');
  });

  it('should open the new-user wizard in a dialog and reload the list when it closes', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    const dialog = el.querySelector<HTMLDialogElement>('dialog')!;

    expect(el.querySelector('app-new-user')).toBeNull();
    el.querySelector<HTMLButtonElement>('.user-list__toolbar button')!.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(el.querySelector('app-new-user')).not.toBeNull();

    dialog.querySelector<HTMLButtonElement>('.ui-dialog__close')!.click();
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/users')).flush(USERS);
    await fixture.whenStable();
    expect(el.querySelector('app-new-user')).toBeNull();
  });

  it('should open the edit wizard for the clicked row', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelectorAll<HTMLButtonElement>('tbody .ui-table__actions button')[1].click();
    await fixture.whenStable();
    expect(el.querySelector('app-edit-user')).not.toBeNull();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/users/u2')).flush({ ...USERS[1], contracts: [] });
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/roles')).flush([]);
    await fixture.whenStable();
    expect(el.querySelector('app-edit-user')!.textContent).toContain('Vas a modificar a Bruno Díaz');
  });
});
