import { describe, expect, it } from 'vitest';
import { generateRefreshToken, hashRefreshToken } from './refresh-token';

describe('generateRefreshToken', () => {
  it('produces a URL-safe 256-bit token that is different every time', () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });
});

describe('hashRefreshToken', () => {
  it('is stable, so a token can be looked up by its hash', () => {
    expect(hashRefreshToken('abc')).toBe(hashRefreshToken('abc'));
  });

  it('never contains the token itself', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).not.toContain(token);
  });
});
