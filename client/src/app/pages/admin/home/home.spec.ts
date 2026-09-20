import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

const SUMMARY = {
  units: { community: 1, building: 2, apartment: 4, account: 4 },
  users: { total: 5, active: 4 },
  contracts: { current: 6, endingSoon: 1 },
};

describe('Home', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should render one metric per count with its hint', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/summary')).flush(SUMMARY);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const metrics = [...el.querySelectorAll('.home__metric')];
    expect(metrics).toHaveLength(6);
    expect(metrics[2].textContent).toContain('4');
    expect(metrics[2].textContent).toContain('Departamentos');
    expect(metrics[4].textContent).toContain('de 5 en total');
    expect(metrics[5].textContent).toContain('1 vencen en 30 días');
    expect(el.querySelectorAll('ui-card')).toHaveLength(2);
  });

  it('should show an error when the summary fails', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/summary')).flush({ message: 'x' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.ui-form__error')?.textContent).toContain('No se pudo cargar');
  });
});
