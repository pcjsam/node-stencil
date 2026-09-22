# Stencil

Open **this git root** as the Cursor workspace (the folder that contains `readme.md` and `server/`). Project rules live in `.cursor/rules/` and only bind correctly from that root.

This repository contains `server/generation` (XML schema + generator) and `server/api` (NestJS + React admin). There is no `app/` mobile tree. Ignore docs that assume `app/src/`.

## How to work

1. Teach the Stencil workflow. Do not invent a parallel source of truth next to the XML schema.
2. Before entity, API, or CRUD work, read `server/api/ai/ruleset.md`, then `server/api/ai/code-generation.md`.
3. Schema changes go in `server/generation/xml/stencil-entities.xml`. Then run `server/generation/tools/code-generator-cli.exe` (or `src/generate.ps1` / `src/generate.sh` if it is not built yet). Do not hand-edit files the generator rewrites (`.base.ts`, `*.model.ts`, `*.schema.ts`, admin list/editor, frontend models and API hooks).
4. Custom logic goes in the extension files the generator creates once and then skips: `*.manager.ts`, `*.controller.ts`.
5. When explaining generation, describe that log line (Created/Updated vs Skipping existing file). Do not teach `STARTFILE`, `ENSUREFILE`, or `ENDFILE` unless someone is editing an XSL template. Those markers are stripped before the file is written.
6. Hard safety rules always apply: body sanitization, jurisdiction from `request.account`, dual-homed `local_account_id`, tombstones, privacy logging, named contracts, additive schema, strict XML types.

Long-form patterns: `server/api/ai/`. What Stencil gives you: `server/api/ai/enterprise-features.md`. Strict enforcement: `.cursor/rules/`. Optional practice track: `docs/training/`.
