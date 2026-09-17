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
