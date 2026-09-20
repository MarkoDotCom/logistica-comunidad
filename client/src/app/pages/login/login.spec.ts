import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Session } from '../../core/session';
import { fakeSession } from '../../core/session.testing';
import { Login } from './login';

describe('Login', () => {
  it('should log in and go to the first allowed section, or show the API error', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const session = fakeSession(['users.read']);
    await TestBed.configureTestingModule({ imports: [Login], providers: [provideRouter([]), { provide: Session, useValue: session }] }).compileComponents();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const login = vi.spyOn(session, 'login').mockResolvedValue(undefined);
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const set = (name: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`[formControlName="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('email', 'tomas.ibanez@example.com');
    set('password', 'Comunidad2026!');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(login).toHaveBeenCalledWith('tomas.ibanez@example.com', 'Comunidad2026!');
    expect(navigate).toHaveBeenCalledWith('/admin/usuarios');

    login.mockRejectedValueOnce({ error: { message: 'Email o contraseña incorrectos' } });
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(el.querySelector('.ui-form__error')?.textContent).toContain('Email o contraseña incorrectos');
    vi.unstubAllGlobals();
  });
});
