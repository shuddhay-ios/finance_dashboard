import { createHash, randomBytes } from 'node:crypto';

// 32 random bytes = 256 bits: far too many possibilities to ever guess.
const TOKEN_BYTES = 32;

/**
 * An unguessable random string (refresh tokens, download links). It means nothing by
 * itself: the server finds what it belongs to by looking up its hash.
 */
export function generateOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Stored instead of the token, so a leaked database can't be replayed. A fast hash is
 * enough here, unlike passwords: a random 256-bit token can't be guessed, so slowing
 * down guesses buys nothing.
 */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
