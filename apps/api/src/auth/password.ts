import argon2 from 'argon2';

// argon2id is OWASP's first choice for password hashing. It is deliberately slow and
// memory-hungry, so each guess an attacker makes against a stolen hash is expensive.
export function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, { type: argon2.argon2id });
}
