import { describe, expect, it } from 'vitest';
import { generateOpaqueToken, hashOpaqueToken } from './opaque-token';

describe('generateOpaqueToken', () => {
  it('produces a URL-safe 256-bit token that is different every time', () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });
});

describe('hashOpaqueToken', () => {
  it('is stable, so a token can be looked up by its hash', () => {
    expect(hashOpaqueToken('abc')).toBe(hashOpaqueToken('abc'));
  });

  it('never contains the token itself', () => {
    const token = generateOpaqueToken();
    expect(hashOpaqueToken(token)).not.toContain(token);
  });
});
