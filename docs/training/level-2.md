# Level 2 — AI authored, human approved

## Objective

Leave this level able to **let the AI draft schema and APIs**, then reject or fix every field, FK, perspective, erasure stance, and test before you accept the diff. You can explain lists and cards as if you had typed them. Moving a card between lists is not in scope.

## What this is

In general: **the AI is the first author; you are the reviewer who still understands the draft.** You will not specify every column for the rest of your career. You still must catch a bad schema. This level practices *letting it start* without merging “the assistant did some XML” in your head.

Give an **outcome**, not a field list. Demand a plan you can repeat (entities, tenant, FKs, projections, perspectives, `accountDeletion`, which extension files you will edit). Then let Agent mode implement. You send it back if it packed JSON, skipped a stance, used `replace` for a partial write, or ignored work you already shipped.

**Cursor:** Agent only after you can repeat that plan out loud. You are allowed to type-fix XML after the draft. You are not allowed to approve a manager you cannot explain.

## This kanban

**`Board` already exists.** Extend it with ordered **lists (columns)** and **cards**. Owner can create a list on a board, create a card on a list, and list cards for a board. Admin can see them. Lists and cards die with the account. Do not replace `Board`.

You still judge:

- Unambiguous names (`board_list_name`, `card_title` — not two `name` fields).
- FKs: list → board, card → list (and board if you list cards by board). `foreignKey` / `uiParent`; no join collection.
- Order (`sequence` or similar), sortable.
- Perspectives so renaming a card does not `replace` the whole document.
- `accountOwner` + `accountDeletion="owned"` (or a justified `hosted` delete you implement on `*.manager.ts`).
- A `<feature>` for owner `/v1/...` APIs. `Sanitize.for`, jurisdiction from `request.account`.
- E2E under `server/api/backend/test/features/`: create list → create card → list cards; `expectStrictResponseShape`; unauthenticated 4xx.

## Kickstarters

First message (plan, then code):

> I already have a Board entity from level 1. I want boards to contain ordered lists of cards, like Trello. The owner should create a list on a board, create a card on a list, and list cards for a board. Admin should see them. Lists and cards should be physically deleted when the account is erased. Do not replace Board — extend it. Propose the XML (entities, fields, FKs, projections, perspectives, accountDeletion) and which feature APIs you would add. Do not edit files until I approve that plan field by field.

Then, in review:

> Walk each field you proposed. Why that name? Why that tenant? Why that foreignKey? If you used name instead of board_list_name or card_title, fix it.

> I want creating a card to be a typed /v1 body, not a generic JSON blob. Show me the Sanitize.for type and where jurisdiction_id comes from.

> I want renaming a card later without clobbering its list or sequence. Which perspective did you use, and what would replace have done instead?

> After generate, which files did the log update, and which did it skip? Which of those must I never hand-edit?

> Add an E2E test: authenticated owner creates a list, creates a card, lists cards; expectStrictResponseShape; unauthenticated request is 4xx. Do not call it done without that test.

Send the draft back if the plan skipped `accountDeletion`, invented a join table, or started editing `*.manager.base.ts`.

## What “approved” means

- You can point at each new field and say why it exists.
- You know how a card finds its board without a SQL join.
- You know whether the feature was new XML or extra mutations.
- You ran or watched the tests that prove the shape and the auth boundary.

## Attest before level 3

You are ready when every box is true and you can answer every question **out loud**, without opening the diff. If the draft still feels like “the assistant did some XML,” stay on level 2.

### What you did

- [ ] `Board` from level 1 is still there. Lists and cards extend it.
- [ ] I sent at least one draft back (bad name, missing stance, `replace` for a partial write, JSON blob, join collection, or a hand-edit of `*.manager.base.ts`).
- [ ] I can point at each new field and say why it exists.
- [ ] I watched an E2E that creates a list, creates a card, lists cards, checks the response shape, and gets 4xx without auth.
- [ ] Moving a card between lists is still not done.

### What you can explain

- [ ] How a card finds its board: `foreignKey` on the document, not a join table.
- [ ] Why `board_list_name` and `card_title` stay unambiguous when projections are combined.
- [ ] Which write is a perspective, and what `replace` would have wiped.
- [ ] Whether the owner API was a new `<feature>` or extra mutations, and where `Sanitize.for` and `request.account.jurisdiction_id` show up.
- [ ] Why lists and cards are in the erasure plan (`owned`, or a `hosted` stance you implemented on `*.manager.ts`).

### Questions

1. The model proposes `name` on both the list and the card. What do you change, and why?
2. The controller builds the card body as `Record<string, unknown>`. What has to be true instead?
3. A test only checks the happy path. What is still missing before you approve?
4. Which files from this diff are you forbidden to edit by hand on the next change?
