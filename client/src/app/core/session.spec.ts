import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Session } from './session';

const RESPONSE = {
  accessToken: 'jwt-1',
  user: { id: 'u1', email: 'a@example.com', externalAuthId: null, fullName: 'Ana', phone: null, isActive: true, roles: [], permissions: ['units.read', 'users.read'] },
};

describe('Session', () => {
  let http: HttpTestingController;
  let session: Session;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(Session);
  });

  afterEach(() => http.verify());

  it('should log in, keep the token in memory and answer can() and firstAllowed() from the permissions', async () => {
    const login = session.login('a@example.com', 'x');
    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.withCredentials).toBe(true);
    req.flush(RESPONSE);
    await login;

    expect(session.isLoggedIn()).toBe(true);
    expect(session.token()).toBe('jwt-1');
    expect(session.can('units.read')).toBe(true);
    expect(session.can('units.write')).toBe(false);
    expect(session.firstAllowed()).toBe('/admin/comunidades'); // sin summary.read, Inicio no
  });

  it('should restore from the refresh cookie once, sharing the request, and give up quietly', async () => {
    const a = session.restore();
    const b = session.restore();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush(RESPONSE);
    expect(await Promise.all([a, b])).toEqual([true, true]);
    expect(session.user()?.fullName).toBe('Ana');

    const out = session.logout();
    http.expectOne(`${environment.apiUrl}/auth/logout`).flush(null, { status: 204, statusText: 'No Content' });
    await out;
    expect(session.isLoggedIn()).toBe(false);

    const failed = session.restore();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    expect(await failed).toBe(false);
    expect(session.firstAllowed()).toBeNull();
  });
});
