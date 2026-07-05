# AGENTS.md — Ninjago API

This file serves as context for AI coding agents working on this project. 
It contains binding architectural decisions and conventions.
When in doubt, the agent should follow this document rather than generic
"best practices" found online, if they conflict.

## Project Vision

A public REST API focused on the Ninjago universe. The goal is to
demonstrate backend engineering skills (clean architecture, security, consistency),
not just expose database records.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS |
| Runtime | Node.js |
| Package manager | pnpm |
| Database | PostgreSQL (hosting: Neon, version 18) |
| ORM | Drizzle ORM (`drizzle-orm/neon-http`) — **stable version, NEVER the `@rc` tag** |
| Migrations | drizzle-kit (`generate` + `migrate`, never `push` in production) |
| Input validation | class-validator + class-transformer (DTO) |
| Env validation | Zod (custom adapter for `@nestjs/config`, not Joi) |
| API documentation | Swagger (OpenAPI) via `@nestjs/swagger` |
| Auth | JWT + Passport, admin only |
| Rate limiting | `@nestjs/throttler` |
| Security headers | helmet |
| Health check | `@nestjs/terminus` (readiness = DB connection check) |
| Testing | Jest |
| Containerization | Docker + docker-compose (dev) |

## Architecture

Feature-first layout:

```
src/
  auth/
  characters/
  seasons/
  elements/
  weapons/
  locations/
  common/
  config/
  database/
```

Data flow: **Controller → Service → Drizzle → PostgreSQL**
The repository layer is optional — introduce it only when database access
actually becomes complex (not preemptively).

## Key Decisions (binding)

### Primary keys
- **Integer / identity columns**, NOT UUID.
- Syntax: `integer('id').primaryKey().generatedByDefaultAsIdentity()`
- Reason: public, non-sensitive reference API (SWAPI-style) — clean URLs
  (`/characters/12`) are better UX than UUIDs. `BY DEFAULT` (not `ALWAYS`)
  to support seed scripts with hardcoded IDs.

### Audit columns
- `created_at`, `updated_at` (`timestamp with timezone`) on **all main entities**.
- **NOT on M:N (junction) tables** — unnecessary overhead unless the relation
  itself carries business logic (it doesn't for V1).
- Helper: `src/database/schema/helpers.ts` → `idColumn()`, `timestamps`.

### Auth
- Public `GET` endpoints: no authentication.
- `POST` / `PATCH` / `DELETE`: protected by a JWT Guard, admin only.
- Auth is implemented **from the start** (alongside the first CRUD module),
  not left until the end of the project.

### Database models vs. API
- DB models (Drizzle schema) are **never** returned directly to the client.
- Mapping to Response DTOs is **manual** (no mapper library), until the number
  of DTOs grows enough to make that unsustainable.

### Filtering, sorting, pagination
- Each module has its own `XyzQueryDto`.
- Shared concerns (page, limit, sortBy, order) live in one shared
  `PaginationQueryDto` that gets extended — **no generic filter
  abstraction/engine**.

### API response format (binding, 1:1)

Success:
```json
{ "data": {}, "meta": {} }
```
For collections, `meta` contains pagination info.

Error:
```json
{
  "statusCode": 404,
  "message": "Character not found",
  "path": "/api/v1/characters/15",
  "timestamp": "2026-07-01T12:00:00Z"
}
```
Implemented via a global Exception Filter + Response Interceptor.
`timestamp` is always ISO 8601 UTC.

### Enum-like columns (`status`, `species`, `type`...)
- In the DB: plain `varchar`, **no native Postgres ENUM and no CHECK constraint**.
- Value validation happens exclusively at the application layer
  (`class-validator` `@IsEnum()` in the DTO).
- Reason: adding a new value (a new Ninjago era, a new weapon type) must not
  require a DB migration.

### Indexes
- V1: B-tree indexes only (name, number, realm_id, etc.).
- GIN / trigram (`pg_trgm`) indexes for full-text search are **deferred**
  to a later optimization (out of V1 scope) — the dataset is small, `ILIKE`
  without an index is sufficient.

### Config
- All access to `process.env` goes through `AppConfigService`
  (`src/config/config.service.ts`), **never direct `ConfigService.get('KEY')`**
  calls scattered across the codebase — for type safety and autocomplete.
- Env variables are validated with a Zod schema (`src/config/env.schema.ts`)
  at application startup (fail-fast).
- `.env` variables: `NODE_ENV`, `PORT`, `DATABASE_URL` (pooled — runtime),
  `DIRECT_DATABASE_URL` (direct — migrations), `JWT_SECRET`, `JWT_EXPIRES_IN`.

### Migrations
- Workflow: edit `schema.ts` → `drizzle-kit generate` → review the SQL →
  commit → `drizzle-kit migrate`.
- **Never** `drizzle-kit push` in production, never manual DB edits.
- `drizzle.config.ts` uses `DIRECT_DATABASE_URL` (not the pooled one).
- Seed data is kept separate from migrations (never part of migration files).

### Drizzle connection syntax
- Use the current object syntax: `drizzle({ client: sql, schema })`,
  not the older positional form `drizzle(sql, { schema })`.
- DI token for the connection: the string `DATABASE_CONNECTION` (a Drizzle
  instance isn't a class, so Nest DI needs a token), injected via
  `@Inject(DATABASE_CONNECTION)`.

## Explicitly OUT OF SCOPE (V1)

Redis, AI features, GraphQL, CQRS, Event Bus, Kafka/RabbitMQ, WebSockets,
Elasticsearch, microservices, OAuth providers, BetterAuth, native DB enums,
GIN/trigram indexes, generic filter engine, repository layer (unless
actually necessary).

## API versioning

- Implemented via NestJS built-in `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })`
  in `main.ts`, combined with `app.setGlobalPrefix('api')` (prefix and version are
  separate concerns — Nest inserts the version between them automatically).
- Existing controllers need no `version` property — they implicitly fall under `v1`
  via `defaultVersion`.
- When a breaking change is needed for a specific resource, add a new controller
  class with `@Controller({ path: '<resource>', version: '2' })` alongside the
  existing v1 controller (both registered in the same module's `controllers` array).
  Both versions then run live, simultaneously, in the same deployment — no separate
  deploy or git branch switching required for this.
- A `v1` git branch (kept as a snapshot/rollback point) is a separate, complementary
  concern — it preserves source history, it does not by itself keep v1 "live" if the
  deployed code changes.

## V2 Roadmap (not implemented in V1, noted for future reference)

- **Personal Access Tokens (PAT)** — planned addition alongside JWT auth. Will
  require a new `api_tokens` table (hashed token, `user_id`, `expires_at`, `scopes`)
  and a dedicated Guard/strategy that validates against that table instead of a
  signed JWT. Out of scope for V1.

## Conventions for the agent

- Generate files via `nest generate` where it makes sense.
- Do not install packages with `@rc`, `@next`, `@beta` tags without explicit
  approval — always use stable versions.
- A new module = its own directory under `src/`, feature-first, not
  layer-first.
- Before writing code that depends on an external library (Drizzle, Nest,
  Neon), verify the syntax against current documentation — these libraries'
  APIs change quickly and training data may be outdated.
- Always wrap responses in the `{ data, meta }` format / the error format
  above — do not use any other shape.
- Do not add `created_at`/`updated_at` to junction tables unless explicitly
  requested.