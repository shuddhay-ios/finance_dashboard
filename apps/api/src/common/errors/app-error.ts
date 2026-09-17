import { type HttpStatus, HttpException } from '@nestjs/common';
import type { ErrorCode } from '@finance/shared';

/**
 * Thrown by our own code when we know exactly what went wrong. The `code` is what the
 * web app uses to choose the alert chip text.
 */
export class AppError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly details: unknown = null,
  ) {
    super(message, status);
  }
}
