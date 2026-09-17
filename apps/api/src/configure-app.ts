import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

export const API_PREFIX = 'api/v1';

/** App-wide setup shared by main.ts and the integration tests, so tests run the real config. */
export function configureApp(app: NestExpressApplication): void {
  app.useLogger(app.get(Logger));
  // Render puts one proxy in front of the app. Trusting it makes request.ip the real
  // client address, which the login rate limit counts by.
  app.set('trust proxy', 1);
  // Sets safe default security headers (no MIME sniffing, no framing, HSTS, ...).
  app.use(helmet());
  // Reads the refresh token cookie.
  app.use(cookieParser());
  app.setGlobalPrefix(API_PREFIX);
  // Lets MongoDB connections close cleanly when Docker or Render stops the container.
  app.enableShutdownHooks();
}
