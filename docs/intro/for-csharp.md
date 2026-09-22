# Stencil for C# developers

Mappings for ASP.NET (Framework or modern) against **SQL Server**, domain rules in **DataLayers and stored procedures**, IIS or a Windows service at the edge, and tenancy as **client-by-URL, org GUID, or a shard connection string**. Also covers a .NET 8 DI island: the unit of work is still the manager lifecycle, not `SaveChanges`.

Companion pages: [overview](./for-everyone.md), [Mongo is not SQL](./mongo-is-not-sql.md).

## Rosetta stone

| Familiar | Stencil |
|----------------|---------|
| Table + stored proc is the contract | `stencil-entities.xml` is the contract |
| `*DataLayer` wrapping `SqlCommand` / proc | **Manager** — repository + domain rules + lifecycle, the **only** write path |
| God-class DataLayer (thousands of lines) | Generated `*.manager.base.ts` + a **small** `*.manager.ts` for hooks. Do not grow a second DataLayer beside it |
| WebAPI / MVC controller | Feature controller (`/v1/...`) or generated admin controller. HTTP is thin |
| `AddWithValue` / trust the DTO | `Sanitize.for(RequestClass)` on every `@Body()`. System fields cannot be smuggled in |
| `clientId` on every proc, or host → client lookup | `jurisdiction_id` from **`request.account`**, Isolated vs Shared **connection**. Not a body field on user routes |
| User shard via connection manager | Isolated tenant databases; manager picks the connection |
| Soft-delete / status flags in the proc | `deleted_utc` tombstone (+ `edited_utc`). Physical delete is GDPR-only |
| `UPDATE … SET col=` inside a proc | **Perspective** `$set` of a named field group. Full `replace` is exception-only in custom code |
| Join at read, or a SQL view | **Projection** + computed reference snapshot at write |
| Index/FK in SSMS | `<index>`, `<uniquekey>`, `foreignKey` in XML; managers enforce FKs |
| SSIS / T4 / “generate then edit” | Models, schemas, and `*.base.ts` are **rewritten every run.** Not a write-once scaffold. Change XML, regenerate. `*.manager.ts` / `*.controller.ts` are created once and kept |
| `*.Components` custom logic | `*.manager.ts` / `*.controller.ts` |
| Header app key / Forms cookie / JWT SSO | Firebase or local JWT; admin also `X-Admin-Token`. Roles are a **Role** document + generated `AppPermissions` |
| `new SurveyDataLayer()` in a controller | Nest **injects** managers. You do not `new` the Mongo layer |
| EF Core on a modern island (`DbContext`, `AddScoped`) | Closer: DI + a unit of work — but the UoW is the **manager lifecycle**, not a context you `SaveChanges` |
| Redis / SQS / Lambda around the core | Keep that instinct for *integration*. Core domain writes still go through managers |

## What will feel wrong (and is correct)

**The database is not the domain model.** In a proc-centric estate the sproc inventory *is* the model. Here the XML is. If a rule only exists in a manager hook, that is fine — but fields, indexes, and tenant isolation belong in XML or they will not exist on the next generate.

**There is no stored procedure to hide a five-table transaction.** One document is the cheap atomic unit. Move consistency to write-time snapshots and dirty-flag recalculation (`calculation_utc = null`), not “the proc will sort it out when we read.”

**Do not port DataLayer god-classes.** If you catch the AI recreating `WidgetDataLayer` with fifty ad-hoc queries, stop. Add a projection, a `getForSingle` field, or a named manager method that still goes through the lifecycle.

**Jurisdiction is stronger than client-by-URL.** Host-header tenancy that you look up after the fact is not the same as “this process opened the US Atlas cluster and the JWT already has the account.” For `/v1/*`, never take jurisdiction from the body.

**Admin CRUD `replace` is a raw door.** Generated admin endpoints still replace the document (like a privileged SSMS edit). Product feature code must use perspectives, the way you would not call a catch-all `update_all_columns` proc from a buyer API.

## Mongo, in SQL Server language

- Embedded `classOnly` types ≈ what you sometimes stuffed in an XML/JSON column, except they are **schema-first** and queryable as fields.
- Computed reference ≈ a denormalized `ThingName` column you used to maintain in the proc on write. Stencil generates the dirty/fold machinery if you declare it.
- `validateExistence` ≈ `IF NOT EXISTS (SELECT 1 FROM parent …) RAISERROR`. It only runs if you went through the manager.
- Isolated vs Shared ≈ separate catalogs / shard connection strings, chosen for you.
- TTL index ≈ a SQL Agent job that deletes old rows, except it is an index option.
- Queryable encryption ≈ Always Encrypted, declared per field in XML.

Details: [Mongo is not SQL](./mongo-is-not-sql.md).

## Tracing Widget

`stencil-entities.xml` is the contract catalog (the role a proc inventory plays in a SQL estate).

1. Open `server/generation/xml/stencil-entities.xml` and the `Widget` item — fields, tenant, projections, indexes.
2. The insert lifecycle lives on the manager. A rule such as “subtitle cannot equal title” belongs in `validate` or `sanitize` on `widget.manager.ts`, not a new controller.
3. Adding a field: XML, regenerate, confirm the diff is in files the generator rewrote.

## Working with AI

Useful prompt shape:

> “This is a DataLayer rule, not a controller rule. Put it on the manager. Do not use replace. Add a perspective if the fields aren’t grouped. Jurisdiction from the account.”

Ask for the XML attribute before TypeScript. `getForSingle`, `uiGenerate="false"`, `iInvalidateForeignKey` already exist.

Related: [`enterprise-features.md`](../../server/api/ai/enterprise-features.md) (sole-mutator managers, perspectives, dependencies), [`code-generation.md`](../../server/api/ai/code-generation.md).
