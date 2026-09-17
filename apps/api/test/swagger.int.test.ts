import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { setupSwagger } from '../src/swagger';
import { testEnv } from './helpers/test-app';

// Swagger is generated from the zod schemas at startup. If a schema can't be described,
// the real server would crash on boot, so this test boots it the same way main.ts does.
describe('API docs', () => {
  let mongo: MongoMemoryServer;
  let app: NestExpressApplication;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(testEnv(mongo.getUri()))],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
    configureApp(app);
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  it('documents every endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const paths = Object.keys((response.body as { paths: Record<string, unknown> }).paths);

    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/v1/auth/login',
        '/api/v1/transactions',
        '/api/v1/analytics/summary',
        '/api/v1/analytics/trends',
        '/api/v1/analytics/breakdown',
        '/api/v1/exports',
        '/api/v1/exports/{token}/download',
        '/api/v1/export-templates',
      ]),
    );
  });
});
