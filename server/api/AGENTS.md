# Stencil API — Agent Notes

Prefer opening the **git repository root** (parent of `server/`) as the Cursor workspace. Canonical project rules are `.cursor/rules/` at that root.

## Knowledge base (read in order)

1. `ai/ruleset.md` — strictness levels and hard rules
2. `ai/code-generation.md` — XML-first workflow (required for entity/API/CRUD work)
3. `ai/patterns/` — extension, feature controller, and federation patterns

## Hard rules (still apply if this folder is the workspace)

- Never edit files the generator rewrites (`.base.ts`, `*.model.ts`, `*.schema.ts`, generated aggregators, `frontend/src/stencil/**` models/endpoints, admin list/editor).
- Edit `../generation/xml/stencil-entities.xml`, run `../generation/tools/code-generator-cli.exe` (CLI only — not the GUI; `src/generate.ps1` builds it if missing), then customize only `*.manager.ts` and `*.controller.ts`. Explain this with the generator log, not with `STARTFILE` / `ENSUREFILE` / `ENDFILE`.
- Dual-homed reads must include `local_account_id`.
- Feature `@Body()` must use `Sanitize.for(...)` or `Sanitize.ignore()`.
- User `/v1/*` data access uses `request.account.jurisdiction_id`, not caller-provided jurisdiction.
- Federated/sync deletes use `deleted_utc` tombstones, not physical `delete()` (except GDPR/DSAR processors that walk the generated erasure registry).
- Do not log full Firebase UID, `auth_identifier`, JWT `sub`, or equivalent stable ids.
