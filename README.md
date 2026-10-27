<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A fleet vehicle maintenance management REST API, built with NestJS, TypeORM and PostgreSQL.</p>

## Author

- Coder: _[your name]_
- Clan: _[your clan]_

## Description

FleetCore is a backend API for managing a vehicle fleet's preventive and corrective maintenance
lifecycle: vehicles, mechanics, workshops, and the maintenances that tie them together, with
JWT + role-based authentication, an `x-api-key`-protected endpoint for external integrations, and
a uniform success/error response format. See [`docs/plan.md`](./docs/plan.md) for the design
decisions behind every non-obvious choice in this implementation.

## Project setup

```bash
$ npm install
```

Copy `.env.example` to `.env` and fill in real values (a working Postgres connection and a JWT
secret, at minimum):

```bash
$ cp .env.example .env
```

## Running with Docker (recommended)

```bash
$ docker compose up --build
```

This starts the API (`api` service) and a Postgres 15 database (`db` service, healthcheck-gated
so the API waits for it). The schema is created automatically on boot (`synchronize: true`).

## Running locally (without Docker)

Requires a running PostgreSQL instance reachable with the credentials in `.env`.

```bash
# development (watch mode)
$ npm run start:dev

# production build
$ npm run build
$ npm run start:prod
```

## Seeding the database

Populates the database with a ready-to-use dataset (admin + technician users, mechanics linked
to the technicians, workshops, vehicles in every status, and maintenance history). Safe to run
more than once — existing rows are detected by their unique key and skipped.

`npm run seed` compiles the project and runs the seeder against whatever `DATABASE_HOST` points
to in your environment, so where you run it from matters:

- **Running on the host** (API not started via Docker): `DATABASE_HOST` in `.env` is normally
  `db` (the Docker Compose service name), which doesn't resolve outside the Compose network. Set
  it to `localhost` for the seed run:
  ```bash
  $ DATABASE_HOST=localhost npm run seed
  ```
- **Running inside Docker** (the `api` container is already up via `docker compose up`): run the
  seeder inside that container instead, where `DATABASE_HOST=db` already resolves correctly:
  ```bash
  $ docker compose exec api npm run seed
  ```

Seeded credentials (see `src/database/seeders/seed.ts` for the full dataset):

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@fleetcore.com` | `Admin123!` |
| TECHNICIAN | `carlos.perez@fleetcore.com` | `Tecnico123!` |
| TECHNICIAN | `laura.gomez@fleetcore.com` | `Tecnico123!` |

## API documentation

Once the app is running, Swagger UI is available at:

```
http://localhost:3000/docs
```

Authenticate requests in Swagger either with a Bearer JWT (obtained from `POST /auth/login`) or,
for the external-integration endpoint, the `x-api-key` header using one of the keys configured in
`API_KEYS`.

## Run tests

```bash
# unit tests
$ npm run test

# unit tests with coverage
$ npm run test:cov

# e2e tests
$ npm run test:e2e
```

## Environment variables

See `.env.example` for the full list. Key ones:

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port the API listens on |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_db` | Postgres connection |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT signing secret and token lifetime |
| `API_KEYS` | Comma-separated keys accepted by `x-api-key` on external-integration endpoints |

## License

UNLICENSED.
