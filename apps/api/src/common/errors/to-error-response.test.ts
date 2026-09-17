import { ForbiddenException, HttpStatus, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AppError } from './app-error';
import { toErrorResponse } from './to-error-response';

const REQUEST_ID = 'req_test';

describe('toErrorResponse', () => {
  it('keeps the code, message and details of our own AppError', () => {
    const error = new AppError('EXPORT_NO_ROWS', 'No transactions match', HttpStatus.BAD_REQUEST, {
      filters: 1,
    });

    expect(toErrorResponse(error, REQUEST_ID)).toEqual({
      status: 400,
      envelope: {
        code: 'EXPORT_NO_ROWS',
        message: 'No transactions match',
        details: { filters: 1 },
        requestId: REQUEST_ID,
      },
    });
  });

  it('gives framework 404s a stable code', () => {
    const { status, envelope } = toErrorResponse(
      new NotFoundException('Cannot GET /x'),
      REQUEST_ID,
    );

    expect(status).toBe(404);
    expect(envelope.code).toBe('NOT_FOUND');
  });

  it('keeps the status of an unmapped client error', () => {
    const { status, envelope } = toErrorResponse(new ForbiddenException(), REQUEST_ID);

    expect(status).toBe(403);
    expect(envelope.code).toBe('REQUEST_FAILED');
  });

  it('hides the message of an unexpected error', () => {
    const leaky = new Error('connect failed: mongodb://admin:hunter2@db');

    const { status, envelope } = toErrorResponse(leaky, REQUEST_ID);

    expect(status).toBe(500);
    expect(envelope).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      details: null,
      requestId: REQUEST_ID,
    });
  });
});
