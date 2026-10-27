# FleetCore maintenance module — design decisions

This document explains every place where the implementation deviates from, extends, or resolves
an ambiguity in the original assignment spec, and why. It also lists two pre-existing issues in
the codebase that were found (one fixed, one only flagged) while building this out. The goal is
for a reviewer to be able to tell "spec said X, code does Y, here's why" without having to
reverse-engineer intent from the diff.

The `user` module's existing conventions were kept as the template for every new module:
`*.module.ts` / `*.controller.ts` (thin) / `*.service.ts` (business logic + `HttpException`s) /
`entities/*.entity.ts` (plain `@Column()`, `@ApiProperty` on enum columns) / `dto/create-*.dto.ts`
+ `dto/update-*.dto.ts` via `PartialType`, bcrypt for password hashing, soft-delete instead of
hard-delete. All relative imports use explicit `.js` extensions (required by this project's
ESM + `nodenext` TypeScript config).

## 1. Field naming

All new entity/DTO fields use English names (`plate`, `brand`, `mileage`, `status`, `specialty`,
...) instead of the spec's Spanish field names (`placa`, `marca`, `kilometraje`, `estado`,
`especialidad`). This matches the existing `User` entity's convention (`firstname`, `lastname`,
already English) and avoids accented identifiers in code.

## 2. Status representation: enum columns everywhere, not a plain boolean

Vehicle, Mechanic, and Workshop all use a `status` enum column (`AVAILABLE/IN_MAINTENANCE/INACTIVE`
for Vehicle, `ACTIVE/INACTIVE` for Mechanic and Workshop) instead of a plain `isActive: boolean`.
Vehicle needs an enum regardless (three states, not two). Mechanic/Workshop are genuinely binary,
so a boolean would have worked too — the enum was chosen instead purely for consistency: every
new entity now follows the same `status` + `@ApiProperty({ enum, example })` + `@Index()` pattern,
which also self-documents better in Swagger than a bare boolean. `User.isActive` (existing,
untouched) stays a boolean — not worth touching a working file for stylistic consistency.

Vehicle specifically has **no separate `isActive` flag** — `status === INACTIVE` *is* the
soft-delete marker, since the enum already encodes "usable or not." Two overlapping "is this
vehicle usable" flags would just invite them going out of sync.

## 3. Maintenance time window (`scheduledAt` + `scheduledEndAt`)

The spec's minimum field list for a maintenance only mentions "fecha programada" (a single
timestamp), but the mechanic double-booking rule is explicitly time-window based ("de 7:30 a
9:00... tampoco podrá asignársele otro que inicie a las 8:00... sí podrá tener uno que inicie a
las 9:00"). That rule is literally impossible to implement without a start *and* end time, so
`scheduledEndAt` was added. If a client omits it, the service defaults it to
`scheduledAt + 90 minutes` (`DEFAULT_MAINTENANCE_DURATION_MINUTES` in `maintenance.service.ts`) —
an arbitrary but documented assumption.

## 4. Two distinct "no double-booking" rules

- **Vehicle**: flat rule — a vehicle cannot have *any* second `SCHEDULED`/`IN_PROGRESS`
  maintenance, regardless of timing. This matches the spec's wording exactly ("no podrá tener
  simultáneamente más de un mantenimiento activo").
- **Mechanic**: genuinely interval-based — two maintenances only conflict if their
  `[scheduledAt, scheduledEndAt)` windows overlap, checked across *all* workshops (not just the
  same one). Implemented in `MaintenanceService.assertMechanicHasNoOverlap`, with a direct unit
  test for both the overlapping and the back-to-back (non-overlapping) cases.

These are implemented as two separate, independently-testable checks rather than one generic
"double-booking" function, because conflating them would have been wrong for one side or the
other.

## 5. Vehicle mileage sync on completion

Completing a maintenance (`status → COMPLETED`) sets `vehicle.mileage = finalMileage` and
`vehicle.status = AVAILABLE`. The spec never says this explicitly, but it's the only sensible
reading of capturing "kilometraje final" on completion — otherwise the vehicle's mileage would
silently go stale every time a maintenance finishes.

## 6. Cancelling an in-progress maintenance also frees the vehicle

`CANCELLED` from `IN_PROGRESS` also resets `vehicle.status = AVAILABLE`. The spec doesn't address
this case, but without it a cancelled-while-in-progress maintenance would leave its vehicle
permanently stuck in `IN_MAINTENANCE` with nothing actively holding it there. `CANCELLED` from
`SCHEDULED` has no vehicle side effect, since the vehicle was never moved to `IN_MAINTENANCE` for
a maintenance that never started.

## 7. HTTP status code conventions (not pinned by the spec)

- **400** (`BadRequestException`): malformed/invalid input data — mileage lower than the
  vehicle's current reading, missing completion fields, class-validator failures.
- **409** (`ConflictException`): well-formed request that conflicts with current state —
  inactive mechanic/workshop/vehicle, duplicate plate/email, a vehicle or mechanic already
  double-booked, an invalid maintenance status transition.
- **404** (`NotFoundException`): the referenced vehicle/mechanic/workshop/maintenance/user simply
  doesn't exist.
- **401**: don't know who/what is calling (missing/invalid/expired JWT, missing/invalid
  `x-api-key`).
- **403**: know who's calling, but they're not allowed (wrong role via `RolesGuard`, or a
  TECHNICIAN trying to update a maintenance that isn't assigned to them).

## 8. Authorization matrix

Only "create vehicles/mechanics/workshops/users" and "manage maintenances end-to-end" are
unambiguously admin actions in the spec; everything else below is a judgment call, applied via
`@Roles()` (global `RolesGuard`) plus one per-resource ownership check in `MaintenanceService`.

| Endpoint group | ADMIN | TECHNICIAN |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | public | public |
| Vehicle/Workshop/Mechanic list & get-by-id | yes | yes (spec says "protected," not "admin-only") |
| Vehicle/Workshop/Mechanic create/update/activate/deactivate | yes | no |
| `POST /maintenance` | yes | no |
| `PATCH /maintenance/:id/status` | yes, any maintenance | yes, only one assigned to their linked mechanic (403 otherwise) |
| `GET /maintenance`, `/active`, `/vehicle/:id`, `/mechanic/:id` | yes | no |
| `GET /maintenance/mine` (new — no id param) | n/a | yes, resolves their own mechanic profile from their user id |
| `GET /vehicle/external/:plate` | bypasses JWT — `x-api-key` only | bypasses JWT — `x-api-key` only |

A standalone `/user` CRUD controller existed during development (briefly gated admin-only) but was
removed entirely — it duplicated `POST /auth/register` (the actual public signup path, which also
issues a JWT), and nothing in the spec calls for user management as its own feature. The `User`
entity, `UserService`, and the `Roles`/`RoleEnum` decorator all now live under `src/auth/` instead
of a separate `user` module (see §10) — `UserService` keeps only `create`/`findOne`/`findByEmail`
(no controller, no `findAll`/`update`/`remove`, no separate `CreateUserDto`/`UpdateUserDto` —
`RegisterDto` is the one DTO `UserService.create()` takes). It's an internal dependency of
`AuthModule` (register/login) and `MechanicModule` (validating a user before linking it via
`Mechanic.userId`, which now imports `AuthModule` instead of a `UserModule`).

## 9. Self-service ADMIN registration

`POST /auth/register` lets the caller pick `role: ADMIN` or `TECHNICIAN` themselves — the spec
explicitly lists both as registerable roles with no mention of restricting ADMIN. This is a real
security trade-off (anyone can self-register as an admin) but restricting it wasn't asked for and
would contradict the spec, so it's flagged here rather than silently "fixed."

## 10. `Roles`/`RoleEnum` moved to `src/auth/enum/role.enum.ts`

Originally kept at `src/user/enum/roleEnum.ts` to avoid churning a working file. Once the `user`
module was removed entirely (§8), `Roles`/`RoleEnum` moved to `src/auth/enum/role.enum.ts` —
renamed to match the rest of the codebase's `*.enum.ts` convention (`mechanic-status.enum.ts`,
`vehicle-status.enum.ts`, etc.) instead of the original's bare `roleEnum.ts`. `common/guards/roles.guard.ts`
and every controller using `@Roles()` import from there now. This still leaves a minor layering
smell (a "common" guard depending on a feature module, `auth`), but `auth` is the natural home for
role/identity concerns, more so than `user` ever was.

## 11. `main.ts` vs. `APP_GUARD` registration

`ResponseInterceptor` and `HttpExceptionFilter` are registered with plain instantiation in
`main.ts` (`app.useGlobalInterceptors(...)` / `app.useGlobalFilters(...)`), right next to the
existing Swagger bootstrap code — neither class has constructor dependencies, so there's nothing
DI buys here. `JwtAuthGuard` and `RolesGuard`, by contrast, need `Reflector`/`ConfigService`
injected, so they're registered as `APP_GUARD` providers in `AppModule`. This is a deliberate
asymmetry, not an oversight.

`JwtAuthGuard` is global with `@Public()` as the opt-out (used on `/auth/register`, `/auth/login`,
and the `x-api-key` endpoint) — with five+ new controllers, per-route `@UseGuards(JwtAuthGuard)`
would be easy to forget on a new endpoint, silently making it public. Global + explicit opt-out is
secure-by-default. `RolesGuard` is also global, registered *after* `JwtAuthGuard` in the providers
array (order matters: it reads `request.user`, which only `JwtAuthGuard` populates). A route with
no `@Roles()` metadata is simply role-agnostic (any authenticated user), not blocked.

## 12. `.env.example` naming

Uses the repo's **real** variable names (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`,
`DATABASE_PASSWORD`, `DATABASE_db`, `JWT_SECRET`, `JWT_EXPIRES_IN`) plus the new
`API_KEYS=demo-key-partner-1,demo-key-partner-2` — not the spec's example names (`DB_HOST`,
`DB_USERNAME`, `DB_NAME`, ...), which don't match this repo's actual `database.config.ts` /
`docker-compose.yaml`.

**Pre-existing issue, now fixed**: `src/config/database.config.ts` originally read
`process.env.DATABASE_DB` (uppercase `DB`) while `.env`/`docker-compose.yaml` define
`DATABASE_db` (lowercase) — a casing mismatch, since environment variable names are
case-sensitive. This predates this build-out and was fixed to read `DATABASE_db` to match the
real env files.

## 13. `POST /maintenance` has no `status` field at all

Unlike every other module's create-DTO (which exposes a client-settable status/active field with
a server-side default, mirroring `CreateUserDto.role`), `CreateMaintenanceDto` excludes `status`
entirely — the service always forces `SCHEDULED`. Letting a client set the initial status would
let it bypass every business rule in `MaintenanceService.create()` (mileage check, vehicle/mechanic
double-booking checks).

## 14. `GET /maintenance/vehicle/:vehicleId` doubles as "by vehicle" and "vehicle history"

The spec lists "mantenimientos por vehículo" and "historial de mantenimientos de cada vehículo" as
separate requirements. Since maintenances are never hard-deleted, "all maintenances for this
vehicle" *is* its full history — a second endpoint would just duplicate the first.

## 15. Mechanic/Workshop use `activate`/`deactivate`, not `DELETE`

`PATCH /:id/activate` and `PATCH /:id/deactivate` exist instead of a `DELETE` route, because the
spec explicitly asks for bidirectional activate/deactivate ("podrá activar e inactivar"), not a
one-way soft delete. `Vehicle` and `User` keep `DELETE` (deactivate) + `PATCH` (which can
reactivate via its `status` field), matching their existing/mirrored CRUD shape more closely.

## 16. External-integration endpoint

`GET /vehicle/external/:plate`, guarded by `ApiKeyGuard` (`x-api-key` header checked against the
comma-separated `API_KEYS` env var) instead of JWT, marked `@Public()` to skip the global JWT
guard. Response shape matches the spec's example payload exactly: `{ vehicle: {...}, maintenances:
[{ ..., mechanic: {id,name}, workshop: {id,name} }] }` (`ExternalVehicleResponseDto`). The exact
route path isn't pinned by the spec; `vehicle/external/:plate` was chosen as the most descriptive
and is declared before the generic `:id` route so it isn't swallowed by it.

`GET /vehicle/plate/:plate` is a separate static route from `GET /vehicle/:id`, rather than one
polymorphic param that tries to detect numeric-vs-string — mixing the two on one route invites
ambiguity bugs (e.g. a numeric-looking plate).

## 17. Stricter email validation on new fields only

`RegisterDto.email`, `LoginDto.email`, and `CreateMechanicDto.email` use `@IsEmail()`. The
existing `CreateUserDto.email` only uses `@IsString()` — left untouched rather than retrofitted,
to avoid changing validated behavior on a working endpoint outside this task's scope.

## 18. Auth implementation details

- `AuthService.register()` checks `UserService.findByEmail(email, { includeInactive: true })`
  before creating a user — a soft-deleted user's email must stay blocked, not silently become
  reusable. `login()` uses the active-only lookup (a deactivated user simply can't authenticate).
- `JwtStrategy.validate()` re-fetches the user via `UserService.findOne(payload.sub)` on *every*
  request instead of trusting the JWT payload. Since `findOne` only returns active users, a
  deactivated user's still-unexpired token is rejected immediately, not just at next login.

## 19. Transactional status updates

`MaintenanceService.updateStatus()` wraps the maintenance-row update and the vehicle
status/mileage update in a single `DataSource.transaction()` — both changes commit together or
not at all, so a failed vehicle update can never leave a maintenance row pointing at a status the
vehicle never actually reflected.

## 20. `uuid` not added

Every new entity uses `@PrimaryGeneratedColumn()` numeric ids, matching `User`. Nothing in the
spec needs a generated UUID (API keys are static, pre-shared env strings), so the dependency
wasn't added.

## Pre-existing issues found (not introduced by this work)

- **Fixed, then removed**: `src/user/user.controller.spec.ts` predated this build-out and was
  already broken (never mocked `UserRepository`). Fixed using the mocked-repository pattern also
  used by `user.service.spec.ts`/`auth/user.service.spec.ts`, then deleted along with the rest of
  `src/user/` once the controller it tested was removed (§8).
- **Fixed**: `DATABASE_DB` vs `DATABASE_db` casing mismatch — see §12.

## 21. `forbidNonWhitelisted` vs. class field default initializers

`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` rejects any
property that lacks a `class-validator` decorator — `@ApiProperty` (Swagger-only) doesn't count.
With `transform: true`, `class-transformer` builds a real DTO instance from the request body
*before* validation runs, so a class field with its own default initializer (e.g.
`isActive: boolean = true;`) shows up on the instance even when the client never sent it, and gets
rejected as an unknown property. `CreateUserDto.role`/`isActive` and `RegisterDto.isActive` had
this gap (decorator-free defaulted fields, a leftover from before the global `ValidationPipe`
existed) — fixed by adding `@IsOptional()` plus the appropriate type decorator
(`@IsEnum(RoleEnum)` / `@IsBoolean()`) to both. Every DTO field needs at least one
`class-validator` decorator, even purely-optional ones with a default value.

## 22. One IN_PROGRESS maintenance per mechanic at a time

§4's overlap rule (`assertMechanicHasNoOverlap`) only blocks *overlapping time windows* for
`SCHEDULED`/`IN_PROGRESS` maintenances — a mechanic can still have several non-overlapping
`SCHEDULED` jobs queued up across a day, which is intended (per §3.10 of the spec, back-to-back
scheduling is explicitly allowed). But "a technician cannot have more than one active maintenance
at the same time" is interpreted more strictly for the moment a maintenance actually starts: when
a `PATCH /maintenance/:id/status` transition targets `IN_PROGRESS`,
`MaintenanceService.assertMechanicHasNoOtherInProgress` rejects with 409 if that mechanic already
has *any other* maintenance in `IN_PROGRESS` status, regardless of what time window either job was
scheduled for. Rationale: a mechanic can plan/queue multiple future jobs, but can only be
physically working on one vehicle at once — the overlap check governs the schedule, this check
governs reality at the moment work actually begins.

## Known gaps / follow-ups

- `README.md` Coder/Clan fields are left as placeholders for the repo owner to fill in.
