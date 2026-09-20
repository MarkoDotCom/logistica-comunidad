import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiEnvelopeInterceptor } from './api-envelope.interceptor';

describe('apiEnvelopeInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiEnvelopeInterceptor])), provideHttpClientTesting()],
    });
  });

  it('should unwrap data from a successful envelope', () => {
    let body: unknown;
    TestBed.inject(HttpClient).get('/x').subscribe((b) => (body = b));
    TestBed.inject(HttpTestingController)
      .expectOne('/x')
      .flush({ success: true, status: 200, message: 'OK', traceId: 't1', timestamp: '2026-01-01T00:00:00Z', data: [{ id: 1 }] });
    expect(body).toEqual([{ id: 1 }]);
  });

  it('should leave a plain body untouched', () => {
    let body: unknown;
    TestBed.inject(HttpClient).get('/x').subscribe((b) => (body = b));
    TestBed.inject(HttpTestingController).expectOne('/x').flush({ id: 1 });
    expect(body).toEqual({ id: 1 });
  });

  it('should keep the error envelope so pages can read message', () => {
    let error: HttpErrorResponse | undefined;
    TestBed.inject(HttpClient).get('/x').subscribe({ error: (e) => (error = e) });
    TestBed.inject(HttpTestingController)
      .expectOne('/x')
      .flush({ success: false, status: 404, message: 'No existe', code: 'NOT_FOUND', traceId: 't1' }, { status: 404, statusText: 'Not Found' });
    expect(error?.error).toMatchObject({ success: false, message: 'No existe', code: 'NOT_FOUND' });
  });
});
