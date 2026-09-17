import argon2 from 'argon2';

// argon2id is OWASP's first choice for password hashing. It is deliberately slow and
// memory-hungry, so each guess an attacker makes against a stolen hash is expensive.
export function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, { type: argon2.argon2id });
}

export function verifyPassword(passwordHash: string, plainPassword: string): Promise<boolean> {
  return argon2.verify(passwordHash, plainPassword);
}

// A real argon2id hash (same cost settings as hashPassword) of a throwaway string.
// Login verifies against it when the email doesn't exist, so "wrong email" and
// "wrong password" take the same time and an attacker can't use timing to learn
// which emails have accounts.
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$ERCD1NIQqmoO2ndT5UD13Q$hb40CAlV+q7MvdPlPmSCnbulfx7HWU4OsnQAJLxrs3k';
