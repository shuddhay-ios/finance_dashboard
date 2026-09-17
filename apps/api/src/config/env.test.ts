import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('applies defaults when optional variables are missing', () => {
    const env = parseEnv({ MONGODB_URI: 'mongodb://localhost:27017/finance' });

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      MONGODB_URI: 'mongodb://localhost:27017/finance',
      LOG_LEVEL: 'info',
    });
  });

  it('turns PORT from a string into a number', () => {
    const env = parseEnv({ MONGODB_URI: 'mongodb://db', PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });

  it('refuses to start without a database URI', () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI/);
  });

  it('names the bad variable without leaking its value', () => {
    const attempt = () => parseEnv({ MONGODB_URI: 'postgres://admin:hunter2@db' });

    expect(attempt).toThrow(/MONGODB_URI: must start with mongodb:\/\//);
    expect(attempt).not.toThrow(/hunter2/);
  });
});
