import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { UsersApi } from './users.api';

describe('UsersApi', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));

  it('should GET the users, passing the search term as a query param', () => {
    const http = TestBed.inject(HttpTestingController);
    const users = [{ id: 'u1', email: 'ana@example.com', externalAuthId: null, fullName: 'Ana', phone: null, isActive: true }];

    let result: unknown;
    TestBed.inject(UsersApi).list('ana').subscribe((r) => (result = r));

    const req = http.expectOne(`${environment.apiUrl}/users?search=ana`);
    expect(req.request.method).toBe('GET');
    req.flush(users);
    expect(result).toEqual(users);
    http.verify();
  });
});
