import type { ErrorEnvelope, UserResponse } from '@finance/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type SeededApp, startSeededApp, stopSeededApp } from './helpers/seeded-app';

// The smallest valid PNG: a 1x1 pixel image.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('profile', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  });

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  const auth = () => ({ Authorization: `Bearer ${seeded.accessToken}` });

  it('requires login to change a profile', async () => {
    await request(seeded.server).patch('/api/v1/users/me').send({ name: 'X' }).expect(401);
    await request(seeded.server).put('/api/v1/users/me/avatar').expect(401);
  });

  it('changes the display name, which then shows everywhere', async () => {
    const response = await request(seeded.server)
      .patch('/api/v1/users/me')
      .set(auth())
      .send({ name: '  Priya S.  ' })
      .expect(200);
    expect((response.body as UserResponse).name).toBe('Priya S.');

    const me = await request(seeded.server).get('/api/v1/auth/me').set(auth()).expect(200);
    expect((me.body as { user: UserResponse }).user.name).toBe('Priya S.');
  });

  it('rejects an empty name', async () => {
    const response = await request(seeded.server)
      .patch('/api/v1/users/me')
      .set(auth())
      .send({ name: '   ' })
      .expect(400);
    expect((response.body as ErrorEnvelope).code).toBe('VALIDATION_FAILED');
  });

  it('stores an uploaded photo and serves it publicly with its real type', async () => {
    const upload = await request(seeded.server)
      .put('/api/v1/users/me/avatar')
      .set(auth())
      .attach('avatar', TINY_PNG, { filename: 'me.png', contentType: 'image/png' })
      .expect(200);
    const { avatarUrl } = upload.body as UserResponse;
    expect(avatarUrl).toMatch(/^\/api\/v1\/users\/[0-9a-f]{24}\/avatar\?v=\d+$/);

    const image = await request(seeded.server).get(avatarUrl).expect(200);
    expect(image.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(image.body as Buffer, TINY_PNG)).toBe(0);
  });

  it('rejects a file that only pretends to be an image', async () => {
    const response = await request(seeded.server)
      .put('/api/v1/users/me/avatar')
      .set(auth())
      .attach('avatar', Buffer.from('<script>alert(1)</script>'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(400);
    expect((response.body as ErrorEnvelope).details).toEqual([
      { field: 'avatar', message: 'must be a PNG, JPEG or WebP image' },
    ]);
  });

  it('rejects a file over 2 MB', async () => {
    const huge = Buffer.concat([TINY_PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const response = await request(seeded.server)
      .put('/api/v1/users/me/avatar')
      .set(auth())
      .attach('avatar', huge, { filename: 'huge.png', contentType: 'image/png' })
      .expect(413);
    expect((response.body as ErrorEnvelope).code).toBe('VALIDATION_FAILED');
  });

  it('removes the photo and goes back to the generated avatar', async () => {
    const response = await request(seeded.server)
      .delete('/api/v1/users/me/avatar')
      .set(auth())
      .expect(200);
    const { avatarUrl, id } = response.body as UserResponse;

    expect(avatarUrl).toContain('api.dicebear.com');
    await request(seeded.server).get(`/api/v1/users/${id}/avatar`).expect(404);
  });
});
