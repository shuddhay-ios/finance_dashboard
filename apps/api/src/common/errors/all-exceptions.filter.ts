import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { toErrorResponse } from './to-error-response';

/** Catches every exception so no response ever leaves the API in a different error shape. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@InjectPinoLogger(AllExceptionsFilter.name) private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // Our genReqId always returns a string; anything else means the logger didn't run.
    // A streamed download can fail after the headers are sent; no envelope is possible then.
    if (response.headersSent) {
      this.logger.error({ err: exception }, 'Error after response started');
      response.end();
      return;
    }

    const requestId = typeof request.id === 'string' ? request.id : null;
    const { status, envelope } = toErrorResponse(exception, requestId);

    // 4xx are the caller's mistake and already appear in the request log.
    // 5xx are ours and need the full error, stack included.
    if (status >= 500) {
      this.logger.error({ err: exception }, 'Unhandled exception');
    }

    response.status(status).json(envelope);
  }
}
