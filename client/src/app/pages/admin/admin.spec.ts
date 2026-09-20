import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSessionWith } from '../../core/session.testing';
import { Admin } from './admin';

describe('Admin', () => {
  beforeEach(() => vi.stubGlobal('matchMedia', () => ({ matches: false })));
  afterEach(() => vi.unstubAllGlobals());

  it('should render only the sections the person can see, with their name and Salir', async () => {
    await TestBed.configureTestingModule({ imports: [Admin], providers: [provideRouter([]), provideSessionWith(['units.read', 'users.read'], { fullName: 'Lucía Vera' })] }).compileComponents();
    const fixture = TestBed.createComponent(Admin);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect([...el.querySelectorAll('.admin__nav a')].map((a) => a.textContent?.trim())).toEqual(['Comunidades', 'Árbol', 'Usuarios']);
    expect(el.querySelector('.admin__user')?.textContent).toBe('Lucía Vera');
    expect(el.querySelector('ui-button button')?.textContent?.trim()).toBe('Salir');
  });
});
