import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { apiError, apiSuccess, traceIdOf } from './api-response.js';

const ISO_DATE = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/);

describe('apiSuccess', () => {
  it('wraps the payload with status, message and trace', () => {
    expect(apiSuccess({ id: 1 }, 201, 'trace-1')).toEqual({
      success: true,
      status: 201,
      message: 'OK',
      traceId: 'trace-1',
      timestamp: ISO_DATE,
      data: { id: 1 },
    });
  });
});

describe('apiError', () => {
  it('maps a Nest exception with a single message', () => {
    expect(apiError(new NotFoundException('Unidad no encontrada'), 'trace-1')).toEqual({
      success: false,
      status: 404,
      message: 'Unidad no encontrada',
      code: 'NOT_FOUND',
      traceId: 'trace-1',
      timestamp: ISO_DATE,
    });
  });

  it('joins validation messages and keeps them in errors', () => {
    const validation = new BadRequestException({
      statusCode: 400,
      message: ['title should not be empty', 'skills must be an array'],
      error: 'Bad Request',
    });
    expect(apiError(validation, 'trace-1')).toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'title should not be empty. skills must be an array',
      errors: ['title should not be empty', 'skills must be an array'],
    });
  });

  it('falls back to the exception message when the body has none', () => {
    expect(apiError(new HttpException({ ok: false }, 418), 'trace-1')).toMatchObject({ status: 418, code: 'I_AM_A_TEAPOT', message: 'Http Exception' });
  });

  it('hides the cause of unexpected errors behind a 500', () => {
    expect(apiError(new Error('connection refused to db:5432'), 'trace-1')).toMatchObject({
      success: false,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
    });
  });
});

describe('traceIdOf', () => {
  const fakeReq = (header?: string) => ({ header: () => header }) as any;
  const fakeRes = () => ({ setHeader: vi.fn() }) as any;

  it('generates one id per request and echoes it in the response header', () => {
    const req = fakeReq();
    const res = fakeRes();
    const id = traceIdOf(req, res);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(traceIdOf(req, res)).toBe(id);
    expect(res.setHeader).toHaveBeenCalledExactlyOnceWith('x-request-id', id);
  });

  it('reuses a well-formed id sent by the client and ignores a malformed one', () => {
    expect(traceIdOf(fakeReq('client-abc.123'), fakeRes())).toBe('client-abc.123');
    expect(traceIdOf(fakeReq('bad id\nwith newline'), fakeRes())).not.toContain('\n');
  });
});
