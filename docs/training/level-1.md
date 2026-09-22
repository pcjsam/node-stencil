# Level 1 — Human authored, AI guided

## Objective

Leave this level able to **add a real entity to the XML yourself**, regenerate, and explain every choice (tenant, names, projection, perspective, erasure) from the schema to the admin screen. The AI never types the XML. Lists and cards are not in the product yet.

## What this is

In general: **you are the author; the AI is a tutor.** You hold the pen on the source of truth. The model answers “what does this attribute do,” traces existing `Widget` code, and checks your thinking *before* you paste. It does not apply patches.

That is the point. Schema mistakes (Isolated vs Shared, a generic `name`, `replace` instead of a perspective, no `accountDeletion`) are cheaper while the file is still small and you still feel the keystrokes.

**Cursor:** Ask mode only. If the chat offers to edit, refuse and keep asking.

## This kanban

Add `Board`: a jurisdiction-scoped board the account owns. You choose the exact XML; these are the decisions, not a paste:

- Isolated tenant, `jurisdiction_id` as the tenant field.
- `board_name` (not `name`), `account_id` with `accountOwner="true"`.
- A **Public** projection safe to list (id, name — not auth identifiers).
- A perspective for fields the owner will edit (`board_name`, description) so a later “archive” write cannot clobber them.
- `accountDeletion="owned"` plus a phase/order so erasure will pick it up.
- At least one `searchable` field (or `uiGenerate="false"`).

Ask what the generator will emit **before** you run it. Then run the generator (below). Diff the result and read the log. **Created/Updated** means that file is rewritten every run (models, schemas, `*.manager.base.ts`, validators, the frontend model, the admin list/editor). **Skipping existing file** means it was created once and is now yours (`board.manager.ts`, `board.controller.ts`). Nothing inside the file labels which kind it is.

## Run the generator

`server/generation/tools/code-generator.config.xml` is already filled in: the XML schema, the templates, and the output folder. Do not edit it for this exercise.

**Windows — use the GUI.** Open `server/generation/tools/code-generator.exe` from that folder (double-click it there, so it finds the config). The data file, template list, and output folder should already be filled. Click **Generate Files**. If the exe is missing, run `server/generation/tools/src/build.ps1` once (needs the .NET 8 SDK), then open the exe.

**macOS or Linux — use the CLI.** The GUI is WinForms and is not built on those systems. From the repo root:

```bash
./server/generation/tools/src/generate.sh
```

No arguments. The script builds `code-generator-cli` the first time (needs the .NET 8 SDK), then runs it. The CLI reads the same config file. You can also run `server/generation/tools/code-generator-cli` yourself after it exists; start it from `server/generation/tools/` so it finds the config.

## Kickstarters

Paste these (or close variants). Stay in Ask mode. After the answer, **you** edit `stencil-entities.xml`.

Start here:

> I want to add a Board entity so people in a jurisdiction can keep named boards they own. Help me design it in Stencil XML. Walk Widget first so I can copy the right patterns. Do not write the XML for me — tell me which attributes I need and why, then I will type it.

Then, as you work:

> I want Board to be Isolated with board_name, a description, and an owning account. Should jurisdiction_id be the tenant field? What does accountOwner do on account_id?

> I want a Public list of boards that is safe to show in the UI. Which fields belong in the projection, and which must stay off it?

> I want owners to rename a board later without wiping other fields. Is that a perspective, and what should I call it?

> When someone deletes their account I want these boards physically gone. What accountDeletion stance and phase should I put on Board?

> I typed Board into stencil-entities.xml. Before I run the generator, tell me which files the next run will overwrite and which it will leave alone, and what I should look for in the diff.

> I regenerated. Help me trace Board from XML to the manager to the admin list. Did I miss a searchable field or a uiDisplayField?

> Closing a board in the product is not the same as erasing an account. In Stencil terms, what is a tombstone vs a physical delete, and did I mix them up on Board?

## Attest before level 2

You are ready when every box is true and you can answer every question **out loud**, without opening the XML, a generated file, or this page. If you have to look it up, stay on level 1.

### What you did

- [ ] I typed `Board` into `stencil-entities.xml` myself. Agent mode did not edit this repo.
- [ ] I regenerated, and I can point at a file and say whether the log **updated** it or **skipped** it.
- [ ] I can walk one field from XML to the model, the manager base, and the admin screen.
- [ ] Lists and cards are still absent.

### What you can explain

- [ ] Why `Board` is Isolated, and what Shared would mean instead.
- [ ] Why the field is `board_name`, not `name`, and why a new field on an existing collection is nullable.
- [ ] What a **projection** hides on a read, and what a **perspective** limits on a write. Why `replace` would clobber fields the owner did not mean to change.
- [ ] Why a Public list must not include email or `auth_identifier`.
- [ ] What `accountOwner` and `accountDeletion="owned"` do, and why closing a board (`deleted_utc`) is not the same as erasing the account.
- [ ] Why `created_utc` / `updated_utc` are not fields you declare, and why `deleted_utc` is not a “published on” date.

### Questions

1. On a `/v1` route, where does `jurisdiction_id` come from?
2. Which files will the next generator run overwrite, and which will it leave alone?
3. A teammate wants the board title stored as a JSON blob with “whatever the UI needs.” What do you tell them?
4. You add `subtitle` later. Why is it nullable, and which files do you refuse to hand-edit after regenerate?