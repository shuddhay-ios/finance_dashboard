import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const REQUIRED = {
  MONGODB_URI: 'mongodb://localhost:27017/finance',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
};

describe('parseEnv', () => {
  it('applies defaults when optional variables are missing', () => {
    const env = parseEnv(REQUIRED);

    expect(env).toEqual({
      ...REQUIRED,
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 7,
      LOGIN_ATTEMPTS_PER_MINUTE: 5,
      TRUST_PROXY_HOPS: 1,
    });
  });

  it('turns numeric strings into numbers', () => {
    const env = parseEnv({ ...REQUIRED, PORT: '8080', LOGIN_ATTEMPTS_PER_MINUTE: '10' });

    expect(env.PORT).toBe(8080);
    expect(env.LOGIN_ATTEMPTS_PER_MINUTE).toBe(10);
  });

  it('refuses to start without a database URI', () => {
    expect(() => parseEnv({ JWT_ACCESS_SECRET: REQUIRED.JWT_ACCESS_SECRET })).toThrow(
      /MONGODB_URI/,
    );
  });

  it('refuses a JWT secret too short to be safe', () => {
    expect(() => parseEnv({ ...REQUIRED, JWT_ACCESS_SECRET: 'secret' })).toThrow(
      /JWT_ACCESS_SECRET: must be at least 32 characters/,
    );
  });

  it('names the bad variable without leaking its value', () => {
    const attempt = () => parseEnv({ ...REQUIRED, MONGODB_URI: 'postgres://admin:hunter2@db' });

    expect(attempt).toThrow(/MONGODB_URI: must start with mongodb:\/\//);
    expect(attempt).not.toThrow(/hunter2/);
  });
});
