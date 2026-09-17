import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

export const API_PREFIX = 'api/v1';

/** App-wide setup shared by main.ts and the integration tests, so tests run the real config. */
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  // Sets safe default security headers (no MIME sniffing, no framing, HSTS, ...).
  app.use(helmet());
  app.setGlobalPrefix(API_PREFIX);
  // Lets MongoDB connections close cleanly when Docker or Render stops the container.
  app.enableShutdownHooks();
}
