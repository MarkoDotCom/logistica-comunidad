import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { UnitsApi } from './units.api';

describe('UnitsApi', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));

  it('should GET the roots without params and the children with parentId', () => {
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(UnitsApi);

    api.children().subscribe();
    http.expectOne(`${environment.apiUrl}/units`).flush([]);
    api.children('c1').subscribe();
    http.expectOne(`${environment.apiUrl}/units?parentId=c1`).flush([]);
    http.verify();
  });

  it('should PATCH only the given fields', () => {
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(UnitsApi).update('a1', { parentId: 'c1' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/units/a1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ parentId: 'c1' });
    req.flush({});
    http.verify();
  });
});
