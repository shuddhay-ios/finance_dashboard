# Decision log

Short records of choices a reviewer might question: what was picked, the obvious
alternative, and why.

## Money is stored as integer cents

- **Picked:** `amountMinor: 120050` for $1,200.50, converted once at the edge (`toMinorUnits` / `fromMinorUnits` in `packages/shared`).
- **Alternative:** store the float as given, or use `Decimal128`.
- **Why:** floats can't represent most decimals exactly, so sums drift. `Decimal128` is exact but needs conversion everywhere in JavaScript. Integers are exact and MongoDB's `$sum` over them stays exact. The schema validator rejects non-integers, and the seed validates explicitly because `bulkWrite` skips validators.

## Amounts are positive; `category` gives the direction

- **Alternative:** signed amounts (expenses negative).
- **Why:** with both a sign and a category, the two can disagree. One source of truth.

## Plain Mongoose schemas, not `@Prop` decorators

- **Why:** the seed script uses the schemas without starting Nest, and a plain object literal is easier to read than decorator metadata.

## Every sort index ends in `_id`

- **Picked:** `{ date: -1, _id: -1 }` and `{ amountMinor: 1, _id: 1 }`.
- **Alternative:** `{ date: -1 }` and `{ amountMinor: 1 }`.
- **Why:** 31 amounts repeat. Without a unique tiebreaker, two rows with the same amount can swap places between page 1 and page 2, so one row shows twice and another never. Having `_id` in the index lets MongoDB return that order without an in-memory sort.

## Indexes are built by the seed, not on app startup (`autoIndex: false`)

- **Why:** index builds are a deploy step. Letting every API instance try to build them on boot is slow and racy in production. `runSeed` calls `syncIndexes()`, and a test asserts the indexes exist.

## Status is a closed enum

- **Alternative:** accept any string so new statuses "don't need a migration".
- **Why:** MongoDB has no schema migrations. A Mongoose enum is only an application check, so adding a status is a one-line change either way. A closed enum stops `"paid"` or `"PAID"` from getting into the data.

## The environment is validated before Nest starts

- **Why:** a missing `MONGODB_URI` should fail in the first line of output with the variable's name, not as a connection error deep in module initialisation. The error names the variable and the rule, never the value, since values can be secrets.

## Liveness and readiness are separate endpoints

- **Why:** `/health` never touches MongoDB, so a database blip doesn't make the platform restart a healthy container. `/health/ready` pings MongoDB and returns 503 when it can't.

## Every error uses one envelope with a stable code

- **Why:** the web app maps `code` to alert chip text, so wording can change without a backend deploy. Unexpected errors return a generic message plus the `requestId`; the real error only goes to the logs.

## Request ids: accept the caller's, but only if it looks like an id

- **Why:** a load balancer's id makes a request traceable across systems. The pattern check stops anyone injecting newlines or huge strings into logs through a header.

## NestJS 11 rather than the NestJS 10 in the original plan

- **Why:** 10 is two major versions old. 11 is the newest version every library used here officially supports.

## argon2 pinned to 0.41.1

- **Why:** the 0.45 prebuilt Windows binary crashes (access violation) on Node 22.11. 0.41.1 is the same library, still argon2id, and works on Windows and in the Linux image.

## Demo users

- **Picked:** the four `user_id`s become users with invented names and `@example.com` emails, sharing `DEMO_PASSWORD` from the environment.
- **Why:** `example.com` is reserved and can never reach a real inbox. The password is set only when a user is first created (`$setOnInsert`), so re-seeding never changes an existing password.

## Authentication

### Short-lived access token + rotating refresh token

- **Picked:** a 15-minute JWT access token that the web app keeps in memory, plus a 7-day refresh token in an `httpOnly` cookie.
- **Alternative:** one long-lived JWT in `localStorage`.
- **Why:** anything in `localStorage` can be read by an XSS bug. JavaScript can't read an `httpOnly` cookie at all, and a stolen access token dies within 15 minutes.
- **Trade-off:** an access token can't be revoked before it expires. Logout ends the refresh token immediately; the access token stays valid for up to 15 minutes.

### Refresh tokens are random strings stored as hashes, not JWTs

- **Why:** a refresh token has to be revocable, so the server must look it up anyway, and a JWT's self-contained claims add nothing. Only the SHA-256 hash is stored, so a leaked `sessions` collection can't be replayed. SHA-256 rather than argon2 because the token is 256 random bits; slowing down guesses protects nothing.

### Rotation with reuse detection

- Every refresh token works once and is swapped for a new one. All tokens from one login share a `familyId`.
- If a token that was already swapped (`revokedReason: 'rotated'`) comes back, someone copied it. The whole family is revoked, which logs out both the attacker and the real user, and the API returns `AUTH_REFRESH_REUSED`.
- The swap is atomic (`findOneAndUpdate` filtered on `revokedAt: null`), so two concurrent requests with the same token can't both succeed.
- A TTL index on `expiresAt` makes MongoDB delete old sessions by itself.

### Cookie settings

- `httpOnly` (no JavaScript access), `secure` (HTTPS only; browsers treat `localhost` as secure), `SameSite=Strict` (never sent from another site, which blocks CSRF), `Path=/api/v1/auth` (only sent to auth routes).
- `SameSite=Strict` only works if the browser sees the web app and API as the same site. In production the web app on Vercel will forward `/api/*` to the API, rather than calling the API's own domain.

### A hand-written global guard instead of Passport

- **Alternative:** `@nestjs/passport` + `passport-jwt`, as first planned.
- **Why:** verifying a bearer token is about 50 lines with `@nestjs/jwt`. Passport adds a strategy class, a second library and indirection for no extra behaviour here.
- The guard is global (`APP_GUARD`) and routes opt out with `@Public()`. A forgotten decorator locks a route; it never leaves one open.
- Verification pins `HS256`, so a forged token can't pick another algorithm such as `none`.
- Expired and invalid tokens get different codes, because the client reacts differently: refresh quietly vs. log in again.

### No user enumeration on login

- Wrong password and unknown email return the same status, code and message.
- An unknown email still runs one argon2 verification (against a fixed dummy hash), so both cases take the same time.

### Rate limiting only on login

- **Picked:** `@nestjs/throttler` on `POST /auth/login`, 5 attempts per minute per IP (`LOGIN_ATTEMPTS_PER_MINUTE`).
- **Why:** login is the only endpoint where guessing works; refresh tokens are unguessable. `trust proxy` is set so the limit counts the real client IP behind Render's proxy.
- **Limit:** counters live in memory, so each API instance counts separately. With several instances this would need Redis.
