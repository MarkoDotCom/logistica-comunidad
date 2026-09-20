import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

// La API envuelve todo éxito en { success: true, status, message, traceId, timestamp, data }.
// Aquí se extrae `data` para que servicios y páginas trabajen con el recurso directo.
// Los errores llegan como { success: false, status, message, code, traceId, timestamp, errors? } en HttpErrorResponse.error.
export const apiEnvelopeInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event) => (event instanceof HttpResponse && isEnvelope(event.body) ? event.clone({ body: event.body.data }) : event)),
  );

function isEnvelope(body: unknown): body is { success: true; data: unknown } {
  return typeof body === 'object' && body !== null && (body as { success?: unknown }).success === true && 'data' in body;
}
