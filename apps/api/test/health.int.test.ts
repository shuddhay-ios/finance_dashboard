import type { ErrorEnvelope } from '@finance/shared';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, testEnv } from './helpers/test-app';

describe('health endpoints and error envelope', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    app = await createTestApp(testEnv(mongo.getUri()));
    // Nest types the underlying server as any; with the Express adapter it is a Node http.Server.
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  it('reports liveness and returns a generated request id', async () => {
    const response = await request(server).get('/api/v1/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-request-id']).toMatch(/^req_[0-9a-f-]{36}$/);
  });

  it('reuses a well-formed incoming request id but replaces a malformed one', async () => {
    const trusted = await request(server).get('/api/v1/health').set('x-request-id', 'lb-12345678');
    const replaced = await request(server)
      .get('/api/v1/health')
      .set('x-request-id', 'bad id with spaces');

    expect(trusted.headers['x-request-id']).toBe('lb-12345678');
    expect(replaced.headers['x-request-id']).toMatch(/^req_/);
  });

  it('reports readiness when MongoDB answers', async () => {
    const response = await request(server).get('/api/v1/health/ready').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('returns the standard envelope for an unknown route', async () => {
    const response = await request(server).get('/api/v1/nope').expect(404);
    const body = response.body as ErrorEnvelope;

    expect(body.code).toBe('NOT_FOUND');
    expect(body.details).toBeNull();
    expect(body.requestId).toBe(response.headers['x-request-id']);
  });

  // Runs last: it closes the shared connection.
  it('reports not-ready with 503 once the database connection is gone', async () => {
    await app.get<Connection>(getConnectionToken()).close();

    const response = await request(server).get('/api/v1/health/ready').expect(503);

    expect((response.body as ErrorEnvelope).code).toBe('SERVICE_UNAVAILABLE');
  });
});
