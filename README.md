# Finance Dashboard

A full-stack financial analytics dashboard: JWT login, summary metrics and charts, a
searchable/sortable/filterable transaction table, and a CSV export where the user picks
the columns and their order.

**Stack:** NestJS 11 · MongoDB 7 (Mongoose 8) · zod · React + TypeScript · pnpm monorepo

> 🚧 Work in progress. Done so far: project foundation, data model, seed, logging, error
> handling, health checks, API docs. Next: authentication, then the data and export API,
> then the web app.

## Quick start

Requires Docker.

```bash
cp .env.example .env
docker compose up --build
```

This starts MongoDB, loads the 300 transactions once, and starts the API:

| URL                                       | What                              |
| ----------------------------------------- | --------------------------------- |
| http://localhost:3000/api/v1/health/ready | `{"status":"ok","database":"up"}` |
| http://localhost:3000/api/docs            | Swagger API docs                  |

### Without Docker (for development)

Requires Node 22+, pnpm 10 and a MongoDB you can reach (the compose `mongo` service works).

```bash
pnpm install
cp .env.example .env
pnpm --filter @finance/shared build
pnpm --filter @finance/api seed
pnpm --filter @finance/api dev
```

### Checks

```bash
pnpm lint
pnpm typecheck
pnpm test        # unit + integration; integration tests use an in-memory MongoDB, no setup needed
```

## What the data told us

Findings from the provided `transactions.json` (300 records) and the decision each one led to.

| #   | Finding                                                                                                     | Why it matters                                                                              | Decision                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| D-1 | `category` has only 2 values (Revenue 150 / Expense 150)                                                    | A category pie chart would be two equal slices                                              | Breakdown chart with a switchable dimension: category / status / user / month                              |
| D-2 | `user_profile` is the same URL on all 300 rows, and that site returns a new random face on every request    | Avatars would change on every render and identify nobody                                    | Seed a real `users` collection from the 4 distinct `user_id`s, with deterministic avatars seeded on the id |
| D-3 | `amount` is a float (`1200.5`)                                                                              | Floating point can't represent most decimals exactly (`0.29 * 100` is `28.999999999999996`) | Store `amountMinor` as integer cents (`120050`); convert only for display                                  |
| D-4 | No description, merchant or currency field                                                                  | "Search across fields" can't mean free-text search                                          | Search id, user name/email, category, status, plus exact amount; the search box says so                    |
| D-5 | `id` is a plain integer 1–300                                                                               | Would clash with MongoDB's own `_id`                                                        | Keep it as `externalId` with a unique index; seeding upserts on it                                         |
| D-6 | Only 4 distinct users                                                                                       | The user filter is small but real                                                           | Keep it; it makes the by-user breakdown meaningful                                                         |
| D-7 | All dates are in 2024. Every month has 23–29 rows, but 300 rows over 366 days leaves at least 66 empty days | A daily chart would silently skip days                                                      | Fill empty time buckets with zeros on the server                                                           |
| D-8 | `status` is only Paid / Pending; 31 amounts appear more than once                                           | Sorting by amount has ties                                                                  | Closed enum for status; every sort adds `_id` as a tiebreaker so pages never overlap                       |

## Project layout

```
apps/api          NestJS API
packages/shared   zod schemas, enums and money helpers used by both API and web
docs/decisions.md why things are built the way they are
```

`packages/shared` is the single source of truth for shapes that cross the network: the API
validates with the same zod schemas the web app derives its TypeScript types from.

## Out of scope

Creating/editing transactions, self-registration and password reset, multi-currency,
multi-tenancy, caching (unnecessary at 300 rows), Kubernetes/Terraform.
