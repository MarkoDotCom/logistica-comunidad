import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, Observable } from 'rxjs';
import { apiSuccess, type ApiSuccess, traceIdOf } from './api-response.js';

// Envuelve lo que devuelve cada controlador en ApiSuccess. El código HTTP ya viene fijado por Nest (@HttpCode o el de por defecto del método).
@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<ApiSuccess<unknown>> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    return next.handle().pipe(map((data) => apiSuccess(data, res.statusCode, traceIdOf(req, res))));
  }
}
