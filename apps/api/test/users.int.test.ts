import type { UserListResponse } from '@finance/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type SeededApp, startSeededApp, stopSeededApp } from './helpers/seeded-app';

describe('GET /users', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  });

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  it('requires login', async () => {
    await request(seeded.server).get('/api/v1/users').expect(401);
  });

  it('lists the four dataset users by name, without emails or roles', async () => {
    const response = await request(seeded.server)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${seeded.accessToken}`)
      .expect(200);
    const { data } = response.body as UserListResponse;

    expect(data.map((user) => user.name)).toEqual([
      'Ananya Iyer',
      'Kabir Singh',
      'Priya Sharma',
      'Rohan Mehta',
    ]);
    expect(Object.keys(data[0] ?? {}).sort()).toEqual(['avatarUrl', 'externalId', 'id', 'name']);
  });
});
