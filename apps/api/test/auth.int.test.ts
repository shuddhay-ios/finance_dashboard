import type { ErrorEnvelope, LoginResponse, MeResponse, RefreshResponse } from '@finance/shared';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../src/auth/password';
import { USER_MODEL, type User } from '../src/users/user.schema';
import { createTestApp, testEnv } from './helpers/test-app';

const EMAIL = 'priya.sharma@example.com';
const PASSWORD = 'Analyst@2024';

/** The "refresh_token=..." part of the Set-Cookie header, ready to send back as a Cookie. */
function refreshCookieOf(response: Response): string {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = header?.find((value) => value.startsWith('refresh_token='));
  if (!cookie) {
    throw new Error('Response did not set a refresh_token cookie');
  }
  return cookie;
}

function cookiePair(setCookie: string): string {
  return setCookie.split(';')[0] ?? '';
}

describe('authentication', () => {
  let mongo: MongoMemoryServer;
  let app: NestExpressApplication;
  let server: Server;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    app = await createTestApp(testEnv(mongo.getUri()));
    server = app.getHttpServer();

    const userModel = app.get<Model<User>>(getModelToken(USER_MODEL));
    await userModel.create({
      externalId: 'user_001',
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      name: 'Priya Sharma',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=user_001',
    });
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  async function logIn(): Promise<{ accessToken: string; refreshCookie: string }> {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(200);
    return {
      accessToken: (response.body as LoginResponse).accessToken,
      refreshCookie: cookiePair(refreshCookieOf(response)),
    };
  }

  describe('POST /auth/login', () => {
    it('returns an access token, a safe user, and a locked-down refresh cookie', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);
      const body = response.body as LoginResponse;

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.user).toMatchObject({ email: EMAIL, name: 'Priya Sharma', role: 'analyst' });
      expect(JSON.stringify(body)).not.toMatch(/passwordHash|Analyst@2024|argon2/);

      const cookie = refreshCookieOf(response);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/v1/auth');
    });

    it('treats the email as case-insensitive', async () => {
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'Priya.Sharma@Example.com', password: PASSWORD })
        .expect(200);
    });

    it('gives a wrong password and an unknown email the exact same answer', async () => {
      const wrongPassword = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: EMAIL, password: 'wrong-password' })
        .expect(401);
      const unknownEmail = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: PASSWORD })
        .expect(401);

      // requestId differs per request by design; everything else must match exactly.
      const withoutRequestId = (envelope: ErrorEnvelope) => ({
        code: envelope.code,
        message: envelope.message,
        details: envelope.details,
      });
      expect(withoutRequestId(wrongPassword.body as ErrorEnvelope)).toEqual({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        details: null,
      });
      expect(withoutRequestId(unknownEmail.body as ErrorEnvelope)).toEqual(
        withoutRequestId(wrongPassword.body as ErrorEnvelope),
      );
    });

    it('rejects a malformed email with the field that is wrong', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: PASSWORD })
        .expect(400);
      const body = response.body as ErrorEnvelope;

      expect(body.code).toBe('VALIDATION_FAILED');
      const fields = (body.details as { field: string }[]).map((problem) => problem.field);
      expect(fields).toEqual(['email']);
    });
  });

  describe('protected routes (GET /auth/me)', () => {
    it('returns the user for a valid access token', async () => {
      const { accessToken } = await logIn();

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((response.body as MeResponse).user.email).toBe(EMAIL);
    });

    it('rejects a request with no token', async () => {
      const response = await request(server).get('/api/v1/auth/me').expect(401);
      expect((response.body as ErrorEnvelope).code).toBe('AUTH_TOKEN_INVALID');
    });

    it('says "expired" for an expired token, so the client knows to refresh', async () => {
      const expired = await app.get(JwtService).signAsync({ sub: 'someone' }, { expiresIn: -10 });

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);

      expect((response.body as ErrorEnvelope).code).toBe('AUTH_TOKEN_EXPIRED');
    });

    it('rejects a token whose signature was tampered with', async () => {
      const { accessToken } = await logIn();
      // Change one character in the middle of the signature (the part after the last dot).
      const middle = accessToken.lastIndexOf('.') + 20;
      const replacement = accessToken[middle] === 'A' ? 'B' : 'A';
      const tampered = accessToken.slice(0, middle) + replacement + accessToken.slice(middle + 1);

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tampered}`)
        .expect(401);

      expect((response.body as ErrorEnvelope).code).toBe('AUTH_TOKEN_INVALID');
    });

    it('rejects an unsigned token that claims alg "none"', async () => {
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: 'attacker' })}.`;

      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${unsigned}`)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('swaps the refresh cookie for a new access token and a new cookie', async () => {
      const { refreshCookie } = await logIn();

      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);
      const newCookie = cookiePair(refreshCookieOf(response));

      expect(newCookie).not.toBe(refreshCookie);
      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${(response.body as RefreshResponse).accessToken}`)
        .expect(200);
    });

    it('detects reuse of an old token and ends the whole session', async () => {
      const { refreshCookie: firstCookie } = await logIn();
      const rotated = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', firstCookie)
        .expect(200);
      const secondCookie = cookiePair(refreshCookieOf(rotated));

      // An attacker replays the first (already used) token...
      const replay = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', firstCookie)
        .expect(401);
      expect((replay.body as ErrorEnvelope).code).toBe('AUTH_REFRESH_REUSED');

      // ...so the legitimate newer token stops working too.
      const legitimate = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', secondCookie)
        .expect(401);
      expect((legitimate.body as ErrorEnvelope).code).toBe('AUTH_TOKEN_INVALID');
    });

    it('rejects a request without a cookie', async () => {
      const response = await request(server).post('/api/v1/auth/refresh').expect(401);
      expect((response.body as ErrorEnvelope).code).toBe('AUTH_TOKEN_INVALID');
    });

    it('clears the cookie when refresh fails', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refresh_token=made-up-token')
        .expect(401);

      expect(refreshCookieOf(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });
  });

  describe('POST /auth/logout', () => {
    it('ends the session, clears the cookie, and the refresh token stops working', async () => {
      const { refreshCookie } = await logIn();

      const response = await request(server)
        .post('/api/v1/auth/logout')
        .set('Cookie', refreshCookie)
        .expect(204);
      expect(refreshCookieOf(response)).toMatch(/Expires=Thu, 01 Jan 1970/);

      const afterLogout = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
      expect((afterLogout.body as ErrorEnvelope).code).toBe('AUTH_TOKEN_INVALID');
    });
  });
});

describe('login rate limit', () => {
  let mongo: MongoMemoryServer;
  let app: NestExpressApplication;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    app = await createTestApp(testEnv(mongo.getUri(), { LOGIN_ATTEMPTS_PER_MINUTE: '5' }));
  });

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  it('allows 5 attempts a minute and blocks the 6th with RATE_LIMITED', async () => {
    const server = app.getHttpServer();
    const attempt = () =>
      request(server).post('/api/v1/auth/login').send({ email: EMAIL, password: 'guess' });

    for (let i = 0; i < 5; i += 1) {
      await attempt().expect(401);
    }
    const blocked = await attempt().expect(429);

    expect((blocked.body as ErrorEnvelope).code).toBe('RATE_LIMITED');
  });
});
