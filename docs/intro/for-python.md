# Stencil for Python developers

Mappings for **FastAPI** (or similar) with **SQLModel/SQLAlchemy**, **Pydantic schemas separate from tables**, **Alembic**, layered **route → service → repository**, and JWT tenancy as **claims on the authenticated principal**. Also covers `FOR UPDATE`, attested repo rules, and soft-delete as a standing flag plus PII scrub.

Companion pages: [overview](./for-everyone.md), [Mongo is not SQL](./mongo-is-not-sql.md).

## Rosetta stone

| Familiar | Stencil |
|----------------|---------|
| FastAPI router, thin handlers | Feature controller. HTTP only. |
| Service (`ProfileService`) | **`widget.manager.ts`** — created once, then yours. Domain + lifecycle. Nest injects it; you do not construct it in the route |
| Repository + `BaseRepository` | Generated manager **base** (`_findIsolated`, `_upsert`, …). Do not add a second repo that talks to Mongoose |
| SQLModel `table=True` | XML `<item>` → generated model + Mongoose schema. You edit XML, not the generated TS |
| Pydantic schema / `response_model` | Feature request types + **projections** (`Account.Self`). Keep HTTP shapes off the full document |
| Alembic revision after model change | Run the **generator** after XML change. Models and schemas are overwritten every run (not a write-once scaffold) |
| `Depends(get_session)` | Nest DI: managers, Mongo connections per tenant |
| Tenant id on the JWT or a `WHERE tenant_id =` filter | **Jurisdiction** — Isolated database + `jurisdiction_id` on the document. User routes: from **`request.account`**, never body. A product entity such as community can sit *inside* a jurisdiction; it is not a substitute for Isolated tenancy |
| `standing=DELETED` + PII scrub | Tombstone `deleted_utc` (+ `edited_utc`) for sync. Physical delete only for GDPR-style paths |
| No default `ON DELETE CASCADE` | Same ethic: managers `validateNoReferences`; no engine cascade |
| Boundary schemas ≠ tables | `Sanitize.for(Class)` + projections. Do not dump `@Body()` onto the entity |
| `lazy='raise'` / fight N+1 | Projections + `getWithin` + computed references. Do not loop `getById` |
| `with_for_update()` | One-document `$set` (perspective) is the cheap atomic unit. Multi-doc locking is not Postgres |
| Control panel `/cp` | Generated React admin CRUD + `AppPermissions` |
| Keycloak roles in `resource_access` | `Role` documents + `RoleManager.hasPermissionCached` + `@Permission(...)` |
| Cron HTTP + asyncio tasks | `TasksModule` + `SCHEDULER_ENABLED` — same image, different process role |
| Firebase for push/events | Familiar as a side channel. Here Firebase (or local JWT) may be **auth**. Do not log full `sub` / `auth_identifier` |
| Hand-written models, agent docs | Same idea: `server/api/ai/` + repo-root `.cursor/rules/`. XML is an extra source of truth |

## What flips

**XML, not Alembic autogenerate.** SQLModel change → Alembic revision → upgrade. Stencil: XML change → generator → models and schemas refresh. Hand-editing those files is the equivalent of editing a migration that Alembic will smash — except it happens **every** generate, not only at deploy.

**No FK planner.** `Field(foreign_key=...)` lets the database refuse orphans. Here `foreignKey=` is a **manager** check. Bypass the manager and Mongo will store the id. Dual-homed reads (`local_account_id` plus grouping field) replace some composite unique indexes that would have been declared in Postgres.

**A product tenant is not Isolated tenancy.** A community, org, or country field can exist *inside* a jurisdiction. Stencil Isolated tenancy is **which cluster the manager opened** and **which `jurisdiction_id` the authenticated account carries**. Copying jurisdiction from a request body on `/v1/*` is a bug, even when other APIs take a nested tenant id in the payload for admin tools.

**Who commits?** Services and repos sometimes share that responsibility. Stencil is stricter: the **manager** owns persist + `calculateAndPersist`. A feature controller that `$set`s “just this one field” is a layering violation, same as a FastAPI route that `session.exec(update(Table))`.

**Soft delete shape.** `standing` + scrub is a domain status. Tombstones are a **sync signal** (`deleted_utc` still on the document). Do not translate “deleted” into a missing row unless you are on a DSAR path.

## Mongo, in Postgres language

- Embedded `classOnly` ≈ JSONB with a schema, not a free blob. Prefer real nested classes over `*_json` strings unless the payload is opaque.
- Projection `.select()` ≈ a typed `RETURNING` list you cannot forget in the service.
- `<uniquekey>` ≈ `UniqueConstraint` — declare it; Mongo will not infer it.
- TTL index ≈ pg_cron / a worker deleting old rows.
- `searchable` blob ≈ `tsvector`, but generated and **excluding encrypted fields**.
- Queryable encryption ≈ pgcrypto / app-level field crypto, declared on the field.
- Isolated vs Shared ≈ separate databases/schemas **and** a different connection, not only `WHERE tenant_id = :id`.

Details: [Mongo is not SQL](./mongo-is-not-sql.md).

## Tracing Widget

Same layering as models / schemas / services, different files:

1. XML `<item name="Widget">` ≈ the SQLModel.
2. `widget.model.ts` / `.schema.ts` ≈ generated table + mapper (rewritten every run).
3. Feature request under `features/**/models` ≈ Pydantic schema (often generated on the FE; backend feature controllers stay hand-written).
4. `widget.manager.ts` ≈ service. `validate` / `applyCalculations` belong here.
5. `Widget.Public` is applied as a Mongo `.select()`; `searchable` is omitted from that mask.

Adding a field: XML, then regenerate — that is the Alembic-shaped step.

## Working with AI

Useful prompt shape:

> “Keep route thin. Manager is the write path. Sanitize.for on the body. Jurisdiction from request.account. If an XML attribute exists (getForSingle, searchable, perspective), use it — don’t add a repository method.”

Do not recreate `widget_repository.py` in TypeScript. The base manager is that file, and it is generated.

Related: [`enterprise-features.md`](../../server/api/ai/enterprise-features.md), [`patterns/feature-controllers.md`](../../server/api/ai/patterns/feature-controllers.md), [`code-generation.md`](../../server/api/ai/code-generation.md).
