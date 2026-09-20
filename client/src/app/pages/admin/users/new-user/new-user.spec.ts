import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NewUser } from './new-user';

describe('NewUser', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NewUser], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function setValue(el: HTMLElement, name: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(`[formControlName="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('should walk the steps, POST the trimmed data and show the result', async () => {
    const fixture = TestBed.createComponent(NewUser);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button'));
    const next = () => buttons().at(-1)!;
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    next().click();
    await fixture.whenStable();
    expect(next().disabled).toBe(true); // datos vacíos

    setValue(el, 'fullName', ' Eva Soto ');
    setValue(el, 'email', 'eva@example.com');
    await fixture.whenStable();
    expect(next().disabled).toBe(false);
    next().click();
    await fixture.whenStable();

    expect(el.textContent).toContain('Eva Soto');
    expect(next().textContent).toContain('Finalizar');
    next().click();

    const post = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/users'));
    expect(post.request.body).toEqual({ email: 'eva@example.com', fullName: 'Eva Soto', phone: undefined });
    post.flush({ id: 'u9', email: 'eva@example.com', externalAuthId: null, fullName: 'Eva Soto', phone: null, isActive: true });
    await fixture.whenStable();

    expect(el.textContent).toContain('Usuario creado');
    buttons().at(-1)!.click(); // Cerrar es la última (primaria)
    expect(closed).toBe(true);
  });

  it('should show the API error on the confirm step', async () => {
    const fixture = TestBed.createComponent(NewUser);
    fixture.componentInstance['form'].setValue({ fullName: 'Ana', email: 'ana@example.com', phone: '' });
    fixture.componentInstance['step'].set(2);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!.click();
    http.expectOne((r) => r.method === 'POST').flush({ message: 'Ya existe un usuario con ese email' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(el.querySelector('.ui-form__error')?.textContent).toContain('Ya existe un usuario con ese email');
  });
});
