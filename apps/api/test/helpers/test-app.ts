import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { type Env, parseEnv } from '../../src/config/env';
import { configureApp } from '../../src/configure-app';

export function testEnv(mongoUri: string): Env {
  return parseEnv({ NODE_ENV: 'test', MONGODB_URI: mongoUri, LOG_LEVEL: 'silent' });
}

/** Boots the real AppModule with the same app-wide setup as main.ts. */
export async function createTestApp(env: Env): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register(env)],
  }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();
  return app;
}
