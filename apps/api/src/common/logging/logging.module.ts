import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { resolveRequestId } from './request-id';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          genReqId: resolveRequestId,
          // Tokens and cookies are credentials: a leaked log line must not be enough to
          // take over someone's session.
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
            censor: '[redacted]',
          },
          customLogLevel: (_req, res, error) => {
            if (error || res.statusCode >= 500) {
              return 'error';
            }
            if (res.statusCode >= 400) {
              return 'warn';
            }
            return 'info';
          },
        },
      }),
    }),
  ],
})
export class LoggingModule {}
