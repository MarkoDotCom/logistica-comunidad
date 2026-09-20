import { TestBed } from '@angular/core/testing';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  const currentTheme = () => document.documentElement.getAttribute('data-theme');

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    await TestBed.configureTestingModule({
      imports: [ThemeToggle],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should use the system preference when no theme is stored', () => {
    TestBed.createComponent(ThemeToggle);
    expect(currentTheme()).toBe('light');
  });

  it('should use the stored theme', () => {
    localStorage.setItem('theme', 'dark');
    TestBed.createComponent(ThemeToggle);
    expect(currentTheme()).toBe('dark');
  });

  it('should toggle and persist the theme on click', () => {
    const fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(currentTheme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
