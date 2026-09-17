import { createHash, randomBytes } from 'node:crypto';

// 32 random bytes = 256 bits: far too many possibilities to ever guess.
const REFRESH_TOKEN_BYTES = 32;

/** An opaque random string. It means nothing by itself; the server looks it up. */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

/**
 * Stored instead of the token. A fast hash is enough here, unlike passwords: a random
 * 256-bit token can't be guessed, so slowing down guesses buys nothing.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
