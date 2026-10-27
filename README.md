<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A fleet vehicle maintenance management REST API, built with NestJS, TypeORM and PostgreSQL.</p>

## Author

- Coder: _[Luis Reyes]_
- Clan: _[Node Nest AM]_

## Table of contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Environment variables](#environment-variables)
4. [Running with Docker (recommended)](#running-with-docker-recommended)
5. [Running locally (without Docker)](#running-locally-without-docker)
6. [Seeding the database](#seeding-the-database)
7. [Test credentials](#test-credentials)
8. [API documentation (Swagger)](#api-documentation-swagger)
9. [Authentication and authorization](#authentication-and-authorization)
10. [Endpoints](#endpoints)
11. [Business rules](#business-rules)
12. [Response format](#response-format)
13. [Running tests](#running-tests)
14. [Design decisions](#design-decisions)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | NestJS |
| Language | TypeScript (ESM) |
| ORM | TypeORM |
| Database | PostgreSQL 15 |
| Auth | JWT (`@nestjs/jwt`, `passport-jwt`) + bcrypt password hashing |
| Validation | `class-validator` / `class-transformer` |
| Docs | Swagger (`@nestjs/swagger`) |
| Tests | Vitest + coverage (v8) |
| Containers | Docker + Docker Compose |

---

## Project structure

```
src/
├── auth/                 # Register, login, User entity, JWT strategy
├── vehicle/              # Vehicle CRUD, status, external (x-api-key) endpoint
├── mechanic/             # Mechanic CRUD and activation
├── workshop/             # Workshop CRUD and activation
├── maintenance/          # Maintenances, status state machine, business rules
├── common/
│   ├── decorators/       # @CurrentUser(), @Public()
│   ├── filters/          # Global exception filter (uniform error format)
│   ├── guards/           # JwtAuthGuard, RolesGuard, ApiKeyGuard
│   ├── interceptors/     # Response interceptor (uniform success format)
│   └── types/
├── config/               # Database and JWT configuration
├── database/seeders/     # Seed script
└── main.ts               # Bootstrap: validation pipe, interceptor, filter, Swagger
docs/plan.md              # Design decisions and spec interpretations
```

---

## Environment variables

Copy the example file and adjust the values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP port the API listens on | `3000` |
| `CONTAINER_NAME` | Docker container name for the API | `FleetCore_api` |
| `DATABASE_HOST` | Postgres host. Use `db` with Docker, `localhost` when running locally | `db` |
| `DATABASE_PORT` | Postgres port | `5432` |
| `DATABASE_USER` | Postgres user | `FleetCore_db` |
| `DATABASE_db` | Database name | `FleetCore_db` |
| `DATABASE_PASSWORD` | Postgres password | `change_me` |
| `JWT_SECRET` | Secret used to sign JWTs | `replace-with-a-long-random-secret` |
| `JWT_EXPIRES_IN` | Token lifetime | `1h` |
| `API_KEYS` | Comma-separated keys accepted in the `x-api-key` header | `demo-key-partner-1,demo-key-partner-2` |

---

## Running with Docker (recommended)

Requirements: Docker and Docker Compose.

```bash
# 1. Create the env file (keep DATABASE_HOST=db)
cp .env.example .env

# 2. Build and start the API and PostgreSQL
docker compose up -d --build

# 3. Seed the database
docker compose exec api npm run seed
```

- The `api` service waits for the `db` service healthcheck before starting.
- Database data is persisted in the `db_data` volume.
- The schema is created automatically on startup (`synchronize: true`).
- The API is available at `http://localhost:3000`.

Useful commands:

```bash
docker compose logs -f api     # follow API logs
docker compose down            # stop containers (data is kept)
docker compose down -v         # stop containers and delete the database volume
```

> If you already have PostgreSQL running locally on port 5432, stop it or change `DATABASE_PORT` to avoid a port conflict.

---

## Running locally (without Docker)

Requirements: Node.js 22+ and a running PostgreSQL instance.

```bash
# 1. Install dependencies
npm install

# 2. Create the env file and set DATABASE_HOST=localhost
cp .env.example .env

# 3. Create the database in PostgreSQL (name must match DATABASE_db)

# 4. Start the API
npm run start:dev        # development (watch mode)
# or
npm run build
npm run start:prod       # production build
```

---

## Seeding the database

The seeder populates the database with a ready-to-use dataset in a single command. It is **idempotent**: each record is looked up by its unique key before it is created, so running it more than once does not duplicate data.

**With Docker** (containers must be running):

```bash
docker compose exec api npm run seed
```

**Locally** (with `DATABASE_HOST=localhost` in `.env`):

```bash
npm run seed
```

`npm run seed` compiles the project and runs the compiled seeder (`dist/database/seeders/seed.js`).

### Seeded data

| Entity | Records |
|---|---|
| Users | 1 ADMIN, 2 TECHNICIAN |
| Mechanics | Carlos Pérez (active, linked to technician 1), Laura Gómez (active, linked to technician 2), Jorge Ramírez (inactive) |
| Workshops | Taller Norte (active), Taller Sur (inactive) |
| Vehicles | `ABC123` AVAILABLE, `DEF456` AVAILABLE, `GHI789` IN_MAINTENANCE, `JKL012` INACTIVE |
| Maintenances | 1 IN_PROGRESS (`GHI789`, Carlos), 1 COMPLETED (`ABC123`, Laura) for history |

---

## Test credentials

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@fleetcore.com` | `Admin123!` |
| TECHNICIAN | `carlos.perez@fleetcore.com` | `Tecnico123!` |
| TECHNICIAN | `laura.gomez@fleetcore.com` | `Tecnico123!` |

API keys (from `.env.example`): `demo-key-partner-1`, `demo-key-partner-2`

---

## API documentation (Swagger)

With the API running, open:

```
http://localhost:3000/docs
```

To test protected endpoints:

1. Call `POST /auth/login` with one of the test credentials.
2. Copy `data.accessToken` from the response.
3. Click **Authorize**, paste the token in the **bearer** field and confirm.
4. For the external integration endpoint, enter a key from `API_KEYS` in the **x-api-key** field.

---

## Authentication and authorization

- **Register / login:** `POST /auth/register` and `POST /auth/login` are public. Passwords are hashed with bcrypt, and a successful login returns a JWT.
- **Global guards:** every route is protected by `JwtAuthGuard` and `RolesGuard` unless it is marked `@Public()`.
- **Custom decorators:**
  - `@Roles()` declares which roles may access a route.
  - `@CurrentUser()` injects the authenticated user into the handler.
  - `@Public()` skips JWT validation.
- **API key:** `ApiKeyGuard` validates the `x-api-key` header against the `API_KEYS` environment variable.

Access is denied when:

| Case | Status |
|---|---|
| No token | `401` |
| Invalid or expired token | `401` |
| User lacks the required role | `403` |
| Missing or invalid API key | `401` |

### Roles

- **ADMIN:** manages vehicles, mechanics, workshops and maintenances, and can query full histories.
- **TECHNICIAN:** sees the maintenances assigned to them (including vehicle and workshop details) and can update the status of their own maintenances.

---

## Endpoints

### Auth

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a user (`ADMIN` or `TECHNICIAN`) |
| POST | `/auth/login` | Public | Log in with email and password, returns a JWT |

### Vehicles

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/vehicle` | ADMIN | Create a vehicle (plate must be unique) |
| GET | `/vehicle` | Authenticated | List all vehicles |
| GET | `/vehicle/:id` | Authenticated | Get a vehicle by id |
| GET | `/vehicle/plate/:plate` | Authenticated | Get a vehicle by plate |
| PATCH | `/vehicle/:id` | ADMIN | Update a vehicle |
| PATCH | `/vehicle/:id/deactivate` | ADMIN | Soft delete (status `INACTIVE`) |
| PATCH | `/vehicle/:id/reactivate` | ADMIN | Reactivate (status `AVAILABLE`) |
| GET | `/vehicle/external/:plate` | `x-api-key` | External integration: vehicle and its maintenance history |

### Mechanics

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/mechanic` | ADMIN | Create a mechanic |
| GET | `/mechanic` | Authenticated | List all mechanics |
| GET | `/mechanic/:id` | Authenticated | Get a mechanic by id |
| PATCH | `/mechanic/:id` | ADMIN | Update a mechanic |
| PATCH | `/mechanic/:id/activate` | ADMIN | Activate a mechanic |
| PATCH | `/mechanic/:id/deactivate` | ADMIN | Deactivate a mechanic (history is kept) |

### Workshops

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/workshop` | ADMIN | Create a workshop |
| GET | `/workshop` | Authenticated | List active workshops |
| GET | `/workshop/:id` | Authenticated | Get a workshop by id |
| PATCH | `/workshop/:id` | ADMIN | Update a workshop |
| PATCH | `/workshop/:id/activate` | ADMIN | Activate a workshop |
| PATCH | `/workshop/:id/deactivate` | ADMIN | Deactivate a workshop |

### Maintenances

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/maintenance` | ADMIN | Create a maintenance (initial status `SCHEDULED`) |
| GET | `/maintenance` | ADMIN | List all maintenances |
| GET | `/maintenance/active` | ADMIN | List active maintenances (`SCHEDULED`, `IN_PROGRESS`) |
| GET | `/maintenance/mine` | TECHNICIAN | Maintenances assigned to the logged-in technician |
| GET | `/maintenance/vehicle/:vehicleId` | ADMIN | Maintenance history of a vehicle |
| GET | `/maintenance/mechanic/:mechanicId` | ADMIN | Maintenances assigned to a mechanic |
| GET | `/maintenance/:id` | ADMIN | Get a maintenance by id |
| PATCH | `/maintenance/:id` | ADMIN | Edit a maintenance (not allowed once `COMPLETED` or `CANCELLED`) |
| PATCH | `/maintenance/:id/status` | ADMIN / TECHNICIAN (own) | Change the maintenance status |

### Example: complete a maintenance

```http
PATCH /maintenance/1/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "COMPLETED",
  "workPerformed": "Brake pad replacement",
  "finalCost": 400000,
  "finalMileage": 62500,
  "finishedAt": "2026-10-27T14:00:00.000Z"
}
```

### Example: external integration

```bash
curl -H "x-api-key: demo-key-partner-1" http://localhost:3000/vehicle/external/ABC123
```

---

## Business rules

**Statuses**

- Vehicle: `AVAILABLE`, `IN_MAINTENANCE`, `INACTIVE`
- Mechanic / Workshop: `ACTIVE`, `INACTIVE`
- Maintenance type: `PREVENTIVE`, `CORRECTIVE`
- Maintenance status: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED`, or `CANCELLED` from `SCHEDULED` or `IN_PROGRESS`

**Rules**

- A maintenance cannot be created for a vehicle, mechanic or workshop that does not exist or is inactive.
- A vehicle cannot have more than one active maintenance (`SCHEDULED` or `IN_PROGRESS`).
- A mechanic cannot have two active maintenances whose time windows overlap, in any workshop. Back-to-back slots are allowed: 7:30–9:00 and 9:00–10:30 is fine.
- A mechanic cannot have more than one maintenance `IN_PROGRESS` at the same time.
- `scheduledEndAt` must be later than `scheduledAt`. If it is omitted, it defaults to 90 minutes after `scheduledAt`.
- A maintenance's mileage cannot be lower than the vehicle's current mileage.
- When a maintenance moves to `IN_PROGRESS`, the vehicle becomes `IN_MAINTENANCE`.
- When a maintenance moves to `COMPLETED`, the vehicle returns to `AVAILABLE` and its mileage is updated.
- Completing a maintenance requires `workPerformed`, `finalCost` and `finalMileage`.
- `COMPLETED` and `CANCELLED` are final states and cannot transition again.
- Status changes and the related vehicle updates run inside a **database transaction**.
- Vehicles, mechanics and workshops are never hard-deleted, so maintenance history is preserved.

Invalid transitions and business-rule conflicts return `409 Conflict` with a descriptive message. Validation errors return `400 Bad Request`.

---

## Response format

Every successful response is wrapped by a global interceptor:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "timestamp": "2026-10-20T19:00:00.000Z"
}
```

Every error is handled by a global exception filter:

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Vehicle #3 already has an active maintenance",
  "path": "/maintenance",
  "timestamp": "2026-10-20T19:00:00.000Z"
}
```

Validation, authentication, authorization, not-found and business-conflict errors (including database unique violations, which map to `409`) never become `500`.

---

## Running tests

The unit tests use mocked repositories, so they **do not need a database**.

### Option 1: locally

```bash
npm install
npm run test         # run all unit tests
npm run test:cov     # run tests with a coverage report
```

### Option 2: inside the Docker container

With the containers running (`docker compose up -d`):

```bash
docker compose exec api npm run test
docker compose exec api npm run test:cov
```

The coverage summary is printed in the terminal, and an HTML report is generated in `coverage/` (open `coverage/index.html`).

---

- the `scheduledEndAt` time window;
- the separate vehicle and mechanic double-booking rules;
- using status enums for soft deletes.