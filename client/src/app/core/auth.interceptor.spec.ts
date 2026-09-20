import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { Session } from './session';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let session: Session;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(Session);
  });

  afterEach(() => http.verify());

  it('should add the bearer token and leave /auth/* requests alone', () => {
    session.token.set('jwt-1');
    TestBed.inject(HttpClient).get('/api/units').subscribe();
    expect(http.expectOne('/api/units').request.headers.get('Authorization')).toBe('Bearer jwt-1');
    TestBed.inject(HttpClient).post('/api/auth/refresh', {}).subscribe();
    expect(http.expectOne('/api/auth/refresh').request.headers.has('Authorization')).toBe(false);
  });

  it('should refresh once after a 401 and retry with the new token', async () => {
    session.token.set('old');
    vi.spyOn(session, 'refreshToken').mockImplementation(async () => {
      session.token.set('new');
      return 'new';
    });
    let body: unknown;
    TestBed.inject(HttpClient).get('/api/units').subscribe((b) => (body = b));
    http.expectOne('/api/units').flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    await new Promise((r) => setTimeout(r));
    const retry = http.expectOne('/api/units');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
    retry.flush([1]);
    expect(body).toEqual([1]);
  });

  it('should send to /login when the refresh fails', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(session, 'refreshToken').mockResolvedValue(null);
    let status = 0;
    TestBed.inject(HttpClient).get('/api/units').subscribe({ error: (e) => (status = e.status) });
    http.expectOne('/api/units').flush({}, { status: 401, statusText: 'Unauthorized' });
    await new Promise((r) => setTimeout(r));
    expect(status).toBe(401);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });
});
