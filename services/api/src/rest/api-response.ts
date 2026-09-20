import { randomUUID } from 'node:crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

// Envoltorio único de toda respuesta de la API, éxito o error.
// El interceptor (api-response.interceptor.ts) arma los éxitos; el filtro (api-response.filter.ts) los errores.
export interface ApiSuccess<T> {
  success: true;
  status: number; // repite el código HTTP
  message: string; // "OK" salvo que el endpoint diga otra cosa
  traceId: string;
  timestamp: string; // ISO 8601
  data: T;
}

export interface ApiError {
  success: false;
  status: number;
  message: string; // explicación legible para el usuario; siempre string
  code: string; // nombre del status ("NOT_FOUND", "BAD_REQUEST"...) para lógica en el cliente
  traceId: string;
  timestamp: string;
  errors?: string[]; // solo en validación: una entrada por regla incumplida
}

// La cabecera se acepta del cliente para correlacionar con sus propios logs y siempre se devuelve.
export const TRACE_ID_HEADER = 'x-request-id';
const TRACE_ID_FORMAT = /^[\w.-]{1,64}$/;
const INTERNAL_ERROR_MESSAGE = 'Error interno del servidor';

type RequestWithTraceId = Request & { traceId?: string };

// Un traceId por petición, creado la primera vez que alguien lo pide (interceptor o filtro).
export function traceIdOf(req: RequestWithTraceId, res: Response): string {
  if (!req.traceId) {
    const incoming = req.header(TRACE_ID_HEADER);
    req.traceId = incoming && TRACE_ID_FORMAT.test(incoming) ? incoming : randomUUID();
    res.setHeader(TRACE_ID_HEADER, req.traceId);
  }
  return req.traceId;
}

export function apiSuccess<T>(data: T, status: number, traceId: string): ApiSuccess<T> {
  return { success: true, status, message: 'OK', traceId, timestamp: new Date().toISOString(), data };
}

export function apiError(exception: unknown, traceId: string): ApiError {
  if (!(exception instanceof HttpException)) return error(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR_MESSAGE, traceId);

  const status = exception.getStatus();
  const body = exception.getResponse();
  // Nest responde con string (`new NotFoundException('x')`) o con { statusCode, message, error }.
  // ValidationPipe manda `message` como string[] con una entrada por regla incumplida.
  const message = typeof body === 'string' ? body : (body as { message?: string | string[] }).message;

  if (Array.isArray(message)) return { ...error(status, message.join('. '), traceId), errors: message };
  return error(status, message ?? exception.message, traceId);
}

function error(status: number, message: string, traceId: string): ApiError {
  return { success: false, status, message, code: HttpStatus[status] ?? 'ERROR', traceId, timestamp: new Date().toISOString() };
}
