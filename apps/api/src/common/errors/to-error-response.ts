import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode, ErrorEnvelope } from '@finance/shared';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { AppError } from './app-error';

export interface ErrorResponse {
  status: number;
  envelope: ErrorEnvelope;
}

export interface FieldProblem {
  field: string;
  message: string;
}

// Nest and its libraries throw plain HttpExceptions (e.g. 404 for an unknown route).
// This table gives those a stable code too.
const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'AUTH_TOKEN_INVALID',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

/** Turns anything thrown during a request into the one error shape the API ever returns. */
export function toErrorResponse(exception: unknown, requestId: string | null): ErrorResponse {
  if (exception instanceof AppError) {
    return {
      status: exception.getStatus(),
      envelope: {
        code: exception.code,
        message: exception.message,
        details: exception.details,
        requestId,
      },
    };
  }

  // The web app shows "field: reason", so validation errors carry one entry per bad field.
  if (exception instanceof ZodValidationException) {
    return {
      status: HttpStatus.BAD_REQUEST,
      envelope: {
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: toFieldProblems(exception.getZodError()),
        requestId,
      },
    };
  }

  if (exception instanceof HttpException && exception.getStatus() < 500) {
    const status = exception.getStatus();
    return {
      status,
      envelope: {
        code: CODE_BY_STATUS[status] ?? 'REQUEST_FAILED',
        message: exception.message,
        details: null,
        requestId,
      },
    };
  }

  // Anything else is a bug or an outage. Its message might contain internals (a stack
  // trace, a connection string), so the client gets a generic message plus the requestId
  // to quote, and the real error goes to the logs.
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    envelope: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      details: null,
      requestId,
    },
  };
}

function toFieldProblems(error: unknown): FieldProblem[] {
  if (!(error instanceof ZodError)) {
    return [];
  }
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}
