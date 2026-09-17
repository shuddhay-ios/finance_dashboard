import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { type Env, parseEnv } from '../../src/config/env';
import { configureApp } from '../../src/configure-app';

export function testEnv(mongoUri: string, overrides: Record<string, string> = {}): Env {
  return parseEnv({
    NODE_ENV: 'test',
    MONGODB_URI: mongoUri,
    LOG_LEVEL: 'silent',
    JWT_ACCESS_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    // High by default so ordinary tests never trip the login rate limit.
    LOGIN_ATTEMPTS_PER_MINUTE: '1000',
    ...overrides,
  });
}

/** Boots the real AppModule with the same app-wide setup as main.ts. */
export async function createTestApp(env: Env): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register(env)],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
  configureApp(app);
  await app.init();
  return app;
}
