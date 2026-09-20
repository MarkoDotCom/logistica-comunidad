import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { apiError, traceIdOf } from './api-response.js';

// Todo error sale con el envoltorio ApiError. Los no controlados se responden como 500 genérico y se registran con su traceId.
@Catch()
export class ApiResponseFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiResponseFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const body = apiError(exception, traceIdOf(req, res));

    if (body.status >= 500) this.logger.error(`[${body.traceId}] ${req.method} ${req.originalUrl}`, exception instanceof Error ? exception.stack : exception);

    res.status(body.status).json(body);
  }
}
