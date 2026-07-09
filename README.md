# Spinjitzu API

A public REST API for the LEGO® NINJAGO® universe — characters, seasons, elements, weapons, locations, and realms.

Inspired by [SWAPI](https://swapi.dev/), Spinjitzu API is built as a production-quality portfolio project: consistent responses, input validation, rate limiting, OpenAPI docs, and a read-only public surface in production.

> LEGO® is a trademark of the LEGO Group of companies, which does not sponsor, authorize, or endorse this site. See [Legal disclaimer](#legal-disclaimer) below.

**Repository:** [github.com/florixak/spinjitzu-api](https://github.com/florixak/spinjitzu-api)

## Quick start

All versioned resources live under:

```
/api/v1
```

| | |
|---|---|
| **Welcome page** | `GET /` |
| **API root** | `GET /api/v1` |
| **OpenAPI docs** | `GET /docs` |
| **Health check** | `GET /api/v1/health` |

Example:

```bash
curl https://spinjitzu-api.vercel.app/api/v1/characters
```

## Resources

| Resource | Description |
|---|---|
| [`/characters`](./src/characters/characters.controller.ts) | Ninja, villains, and other characters |
| [`/seasons`](./src/seasons/seasons.controller.ts) | TV seasons, specials, miniseries, and movies |
| [`/elements`](./src/elements/elements.controller.ts) | Elemental powers (Fire, Ice, Lightning, …) |
| [`/weapons`](./src/weapons/weapons.controller.ts) | Weapons and artifacts |
| [`/locations`](./src/locations/locations.controller.ts) | Places across the NINJAGO® multiverse |
| [`/realms`](./src/realms/realms.controller.ts) | Realms and dimensions |

### Common operations

Every resource supports the same CRUD shape:

| Method | Path | Access |
|---|---|---|
| `GET` | `/api/v1/{resource}` | Public |
| `GET` | `/api/v1/{resource}/{id}` | Public |
| `POST` | `/api/v1/{resource}` | Admin only (disabled in production) |
| `PATCH` | `/api/v1/{resource}/{id}` | Admin only (disabled in production) |
| `DELETE` | `/api/v1/{resource}/{id}` | Admin only (disabled in production) |

In **production**, only `GET` endpoints are reachable. Write operations and the login route return `403 Forbidden` regardless of credentials — this is enforced at the guard level, not just hidden from documentation.

## Response format

### Success

Single resource:

```json
{
  "data": {
    "id": 1,
    "name": "Lloyd Garmadon"
  },
  "meta": {}
}
```

Collection (with pagination):

```json
{
  "data": [
    { "id": 1, "name": "Lloyd Garmadon" },
    { "id": 2, "name": "Kai" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

### Error

```json
{
  "statusCode": 404,
  "message": "Character not found",
  "path": "/api/v1/characters/999",
  "timestamp": "2026-07-07T12:00:00.000Z"
}
```

## Pagination, sorting, and filtering

All list endpoints accept these query parameters:

| Parameter | Default | Description |
|---|---|---|
| `page` | `1` | Page number (min `1`) |
| `limit` | `20` | Items per page (max `100`) |
| `sortBy` | varies | Sortable field for the resource |
| `order` | `asc` | `asc` or `desc` |

Resource-specific filters:

**Characters** — `name`, `element`, `status` (`Alive`, `Deceased`, `Unknown`, `Departed`), `season`

**Seasons** — `title`, `type` (`standard`, `special`, `miniseries`, `movie`), `number`, `releaseYear`

**Weapons** — `name`, `type`, `isArtifact` (`true` / `false`)

**Locations** — `name`, `realmId`, `seasonId`

**Elements / Realms** — `name`

### Examples

```bash
# Paginated character list
curl "/api/v1/characters?page=1&limit=10"

# Filter by element and status
curl "/api/v1/characters?element=Fire&status=Alive&sortBy=name&order=asc"

# Season by type and year
curl "/api/v1/seasons?type=standard&releaseYear=2012"

# Weapons that are artifacts
curl "/api/v1/weapons?isArtifact=true"
```

Detail endpoints return related data — for example, a character includes linked elements, weapons, and seasons.

## API versioning

This API uses URI versioning (`/api/v1`, `/api/v2`, ...). Multiple versions can run side by side in the same deployment; a future version is not expected to break existing `v1` consumers. See [`AGENTS.md`](./AGENTS.md) for the versioning approach.

## Rate limiting

Requests are limited per client:

| Category | Limit |
|---|---|
| Read (`GET`) | 200 req/min |
| Write (`POST` / `PATCH` / `DELETE`) | 20 req/min |
| Login (`POST /auth/login`) | 5 req/min |

Exceeding the limit returns `429 Too Many Requests`.

## Authentication

No authentication is required for public `GET` requests.

Admin `POST` / `PATCH` / `DELETE` operations require a JWT bearer token and are only available outside production (local development and staging). To obtain a token locally:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}'
```

Use the returned `accessToken` as:

```
Authorization: Bearer <token>
```

## OpenAPI / Swagger

Interactive API documentation is available at `/docs` when the server is running.

The spec covers all public endpoints, query parameters, and response schemas. Admin (write) endpoints and the login route are excluded from the published spec in production.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [NestJS](https://nestjs.com/) |
| Language | TypeScript |
| Database | PostgreSQL ([Neon](https://neon.tech/)) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Validation | class-validator + Zod (env) |
| Auth | JWT + Passport |
| Docs | Swagger (OpenAPI) |
| Testing | Jest |

## Local development

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/)
- PostgreSQL database (Neon recommended)

### Setup

```bash
git clone https://github.com/florixak/spinjitzu-api.git
cd spinjitzu-api
pnpm install
cp .env.example .env   # fill in required variables
pnpm db:migrate
pnpm db:seed           # creates the admin user
pnpm start:dev
```

The API runs at `http://localhost:3000`. Swagger UI is at `http://localhost:3000/docs`.

### Environment variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | Server port (default `3000`) |
| `DATABASE_URL` | Pooled PostgreSQL connection string (runtime) |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL connection string (migrations) |
| `JWT_SECRET` | Secret for signing JWTs (min 32 characters) |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d`, `12h` (default `1d`) |
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password |

### Useful commands

```bash
pnpm start:dev      # development with hot reload
pnpm build          # compile for production
pnpm start:prod     # run compiled build
pnpm test           # unit tests
pnpm test:e2e       # end-to-end tests
pnpm db:generate    # generate a Drizzle migration
pnpm db:migrate     # apply migrations
```

### Docker

Requires a `.env` file in the project root (see [Environment variables](#environment-variables)) — `docker-compose.yml` loads it automatically.

```bash
docker compose up --build
```

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and create a feature branch.
2. Follow the existing code style (`pnpm lint`, `pnpm format`).
3. Add or update tests where behavior changes.
4. Open a pull request with a clear description of the change.

See [`AGENTS.md`](./AGENTS.md) for architectural conventions used in this project.

## Legal disclaimer

This is an **unofficial fan project**. It is not affiliated with, sponsored by, or endorsed by the LEGO Group.

LEGO®, NINJAGO®, and related names, marks, characters, and imagery are trademarks and copyrights of the [LEGO Group](https://www.lego.com/). All rights reserved by their respective owners.

This API is provided for educational and non-commercial fan use only. No ownership of LEGO or Ninjago intellectual property is claimed.

## License

[MIT](./LICENSE)
