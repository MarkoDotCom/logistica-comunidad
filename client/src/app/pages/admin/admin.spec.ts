import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Admin } from './admin';

describe('Admin', () => {
  it('should render the dashboard sections in the header', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    await TestBed.configureTestingModule({ imports: [Admin], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(Admin);
    await fixture.whenStable();

    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.admin__nav a')].map((a) => a.textContent?.trim());
    expect(links).toEqual(['Inicio', 'Comunidades', 'Árbol', 'Usuarios', 'Roles']);
    vi.unstubAllGlobals();
  });
});
