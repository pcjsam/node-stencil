# Stencil

A code-generation powered full-stack framework where the **XML schema is the source of truth** and AI is the primary author. You describe your data model in XML; a generator produces the boilerplate across both the NestJS backend and React frontend; AI then adapts the generated extension points to add business logic.

This checkout is a **training clone** for engineers to self-discover Stencil with AI. Open **this git root** as the Cursor workspace so `.cursor/rules/` and `AGENTS.md` apply.

**New to Stencil?** Overview, Mongo vs SQL, C# and Python mappings: [`docs/intro/README.md`](./docs/intro/README.md). Three-level practice track: [`docs/training/README.md`](./docs/training/README.md).

## How It Works

```
stencil-entities.xml  →  [XSL Generator]  →  Generated base files (.base.ts, models, API hooks, CRUD views)
                                                      ↓
                                             Extension files (yours to customize)
```

After a run, the log tells you which kind of file you are looking at. You will not see a marker inside the file.

| What the log says | What it means | Examples |
|-------------------|---------------|----------|
| Created/Updated | Rewritten every run. Edits here are lost. Change the XML instead. | `*.model.ts`, `*.schema.ts`, `*.manager.base.ts`, `*.controller.base.ts`, `*Api.ts`, admin list/editor |
| Skipping existing file | Created the first time, then left alone. Custom logic lives here. | `*.manager.ts`, `*.controller.ts` |

### The AI Workflow

1. **Author or edit XML** — define entities, fields, enums, projections, and API features in `server/generation/xml/stencil-entities.xml`
2. **Run the generator** — `server/generation/tools/code-generator-cli.exe` rewrites the generated files
3. **Adapt the extensions** — business logic goes in `*.manager.ts` and `*.controller.ts`, which the generator will not overwrite

This means AI is rarely writing boilerplate. It focuses on the XML schema design and the custom logic that differentiates each entity.

## What Gets Generated

### Backend (NestJS)

For each entity with a database collection:

- `{entity}.model.ts` — TypeScript interface and class
- `{entity}.schema.ts` — Mongoose schema
- `{entity}.manager.base.ts` — CRUD operations with hooks (`validate`, `sanitize`, `beforeInsert`, `afterInsert`, etc.)
- `{entity}.manager.ts` *(extension)* — Override hooks, add custom queries
- `{entity}.controller.base.ts` — REST endpoints with permission guards
- `{entity}.controller.ts` *(extension)* — Add custom routes

### Frontend (React)

- `stencil/models/entities/{entity}.ts` — TypeScript types and Zod schemas
- `stencil/endpoints/entities/{entity}Api.ts` — RTK Query hooks (`useGet{Entity}Query`, `useCreate{Entity}Mutation`, etc.)
- `views/super/crud/{entity}/{Entity}List.tsx` *(extension)* — Admin list view with DataTable
- `views/super/crud/{entity}/{Entity}Editor.tsx` *(extension)* — Admin editor form

For each enum: picker components (`{Enum}Picker.tsx`, `{Enum}PickerMulti.tsx`) are generated as extension files.

## XML Schema Concepts

### Entities

```xml
<item name="Widget"
      tenant="Isolated"
      useDocument="true"
      uiDisplayField="title"
      uiDefaultSort="created_utc">

  <field type="string" maxLength="150" searchable="true" uiList="true"
         perspective="Info" friendlyName="Title">title</field>

  <projection name="Public" get="true">
    <entry>_id</entry>
    <entry>title</entry>
  </projection>

  <index name="by_jurisdiction_created">
    <entry direction="Ascending">jurisdiction_id</entry>
    <entry direction="Ascending">created_utc</entry>
  </index>
</item>
```

**Tenant isolation** — every entity declares its isolation pattern:

| Value | Description |
|-------|-------------|
| `Isolated` | Scoped to a jurisdiction; gets a `jurisdiction_id` field and `/admin/:jurisdiction_id/` routes |
| `Shared` | Global, no jurisdiction scoping |
| `Route` | The jurisdiction entity itself |

**Perspectives** — group fields for partial updates. A `perspective="Info"` on multiple fields generates an `updateInfoPerspective()` method on the manager.

**Projections** — named field subsets that generate typed variants (`Widget.Public`) and optional getter methods.

### Enums

```xml
<enum name="WidgetStatus">
  <field value="0" friendlyName="Active">active</field>
  <field value="1" friendlyName="Archived">archived</field>
</enum>
```

### User-Facing API Features

Features define typed HTTP contracts. The XML generates a TypeScript RTK Query client for the React admin frontend; the backend controllers are implemented manually using the generated types. This repository has no native app.

```xml
<feature name="auth" area="user" native="true">
  <entity name="RegisterRequest">
    <field type="string">auth_token</field>
    <field type="string">display_name</field>
  </entity>
  <mutation name="register"
            route="v1/auth/register"
            request="params"
            requestType="RegisterRequest"
            itemResult="Account.Self" />
</feature>
```

## Architecture

The backend is a multi-jurisdiction NestJS API deployed as federated Fargate services across multiple AWS regions. Each jurisdiction owns its own MongoDB Atlas cluster. Cross-jurisdiction operations use HMAC-SHA256 signed HTTPS federation calls.

```
Cloudflare (WAF + DNS)
    │
    ├── US ALB → US Fargate → Atlas US (+ Shared DB)
    ├── CA ALB → CA Fargate → Atlas CA
    ├── UK ALB → UK Fargate → Atlas UK
    └── EU ALB → EU Fargate → Atlas EU
                  ◄── Federation HTTPS (HMAC-SHA256) ──►
```

The federation layer is optional. Three deployment topologies are supported:

- **Single-process** (`FEDERATION_MODE=development`) — one process handles all jurisdictions via direct Mongo connections; simplest local dev setup
- **Shared database** — multiple jurisdictions pointing at one Atlas cluster, logically isolated by `jurisdiction_id`
- **Isolated databases** — full production; independent Fargate service and Atlas cluster per jurisdiction

What you get by using Stencil (encryption, federation, tenancy, sliceable deploys, schema-gated change): [`server/api/ai/enterprise-features.md`](./server/api/ai/enterprise-features.md).

See [`server/api/developers/README.md`](./server/api/developers/README.md) for the full architecture diagram, deployment guide, and operations runbook.

## Developer dependencies

Install these before cloning and running. **Cursor** is required for this training clone: project rules (`.cursor/rules/`) and `AGENTS.md` only bind when this **git root** is the Cursor workspace. If the workspace is `server/api` (or similar), rules will not apply.

| Dependency | Why | Notes |
|------------|-----|--------|
| **[Cursor](https://cursor.com)** | Editor + AI with this repo’s rules | Open the folder that contains `readme.md` and `server/`. [Download](https://cursor.com/download). |
| [Git](https://git-scm.com) | Clone and history | |
| [Node.js](https://nodejs.org) **23.4+** and npm **10.9+** | NestJS API + React admin | Matches `server/api/backend/package.json` `engines`. |
| [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (or newer) | One-time generator build | C# knowledge is not required. Binaries are not in git. |
| [Docker](https://docs.docker.com/get-docker/) (optional) | Local four-instance federation | Only for `docker-compose.federation.yml`. |
| MongoDB Atlas (optional) | Persistent Isolated/Shared data | If Shared Mongo URI is unset, the API uses in-memory Mongo. Do not point this clone at production clusters. |
| Firebase (optional) | SSO | Leave unset for local `dev` / `dev-secret` sign-in. |

Windows uses PowerShell (or `build.cmd`) for the generator; macOS/Linux use the `.sh` scripts.

## Getting Started

### Code generator (one-time)

The generator binaries are not in git. After cloning, build once with the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (or newer). You do not need to know C#. Scripts live under `src/` so `tools/` stays just the binaries and config.

```powershell
# Windows
.\server\generation\tools\src\build.ps1
# or
.\server\generation\tools\src\build.cmd
```

```bash
# macOS / Linux
chmod +x server/generation/tools/src/*.sh
./server/generation/tools/src/build.sh
```

This writes the **CLI** (`code-generator-cli.exe` on Windows, `code-generator-cli` on macOS/Linux) into `server/generation/tools/` next to `code-generator.config.xml`. On Windows it also writes the **GUI** (`code-generator.exe`) for humans exploring templates. The GUI is WinForms and is skipped on macOS/Linux — the CLI is enough to generate code.

Then generate (AI and scripts should always use the CLI; no extra args):

```powershell
.\server\generation\tools\code-generator-cli.exe
# or, if the CLI is not built yet:
.\server\generation\tools\src\generate.ps1
```

```bash
./server/generation/tools/code-generator-cli
# or, if the CLI is not built yet:
./server/generation/tools/src/generate.sh
```

`src/generate` builds the CLI first if it is missing. Re-run `src/build` after pulling generator source changes.

### API and frontend

```bash
cd server/api

# Install dependencies
npm run install:all

# Configure environment — copy examples, then edit as needed
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start frontend (localhost:3000) + backend (localhost:3001)
npm start
```

Before signing in for the first time, seed reference data (roles, timezones, jurisdictions):

```bash
curl http://localhost:3001/api/platform/bootstrap
```

Or open [http://localhost:3001/api/platform/bootstrap](http://localhost:3001/api/platform/bootstrap) in a browser. This endpoint is idempotent, requires no authentication, and is only available when `NODE_ENV` is not `production`.

`frontend/.env.example` sets `VITE_API_BASE_URL=http://localhost:3001/api` for local dev. Leave all `VITE_FIREBASE_*` values empty unless you are using SSO (must match backend Firebase config). Set `VITE_ADMIN_GATE_TOKEN` only if `ADMIN_GATE_TOKEN` is set on the backend.

**Sign in without SSO** — leave Firebase unset in `backend/.env` and `frontend/.env` (no `FIREBASE_PROJECT_ID` / `VITE_FIREBASE_*`). The app uses local auth; sign in at http://localhost:3000 with:

| Field | Default |
|-------|---------|
| Username | `dev` |
| Password | `dev-secret` |

Override via `DEV_AUTH_USER` and `DEV_AUTH_PASS` in `backend/.env`. With Firebase configured, the sign-in page shows **Sign in with SSO** instead.

To test full federation locally with four isolated instances:

```bash
docker compose -f server/api/docker-compose.federation.yml up --build
# US :3010 | CA :3011 | UK :3012 | EU :3013
```

## Key Files

| Path | Purpose |
|------|---------|
| `docs/intro/` | Intro pages (overview, C#, Python) and Mongo-vs-SQL |
| `AGENTS.md` | Cursor/agent entrypoint for this training clone — read first |
| `.cursor/rules/` | Project rules that apply automatically when the git root is the workspace |
| `server/generation/xml/stencil-entities.xml` | Schema source of truth — edit this to change entities, enums, or features |
| `server/generation/tools/code-generator.config.xml` | Generator config (templates, XML source, output folder) |
| `server/generation/tools/src/generate.ps1` / `generate.sh` | Build the CLI if needed, then run it |
| `server/generation/tools/code-generator-cli.exe` | Built CLI — AI entrypoint (not in git) |
| `server/generation/tools/code-generator.exe` | Built GUI — Windows only, for humans (not in git) |
| `server/generation/xsl/` | XSL templates that drive code generation |
| `server/api/backend/src/entities/` | Backend entity implementations |
| `server/api/frontend/src/stencil/` | Generated frontend API layer |
| `server/api/ai/` | AI knowledge base — architecture docs and patterns |
| `server/api/ai/enterprise-features.md` | What Stencil gives you (tenancy, federation, encryption, observability, sliceable deploys) |
