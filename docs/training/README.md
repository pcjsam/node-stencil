# Training track

One product, three levels. You are building a **kanban board** (the Trello shape: boards, lists of cards, cards you move). Each level adds to the same schema. Do not start a second app at level 2.

Read [Introducing Stencil](../intro/README.md), [Overview](../intro/for-everyone.md), and [Perspectives and projections](../intro/perspectives-and-projections.md) first. Manuals: [`code-generation.md`](../../server/api/ai/code-generation.md), [`enterprise-features.md`](../../server/api/ai/enterprise-features.md).

Each level page has an **objective**, what the level is **in general**, **kickstarter** prompts, and an **attest** checklist. Do not start the next level until you can check every box out loud, without opening the XML or these pages.

| Level | In general | This kanban | Cursor |
|-------|------------|-------------|--------|
| [1](./level-1.md) | You hold the pen. AI explains. | Type `Board` yourself | **Ask mode only** |
| [2](./level-2.md) | AI drafts. You approve every field. | `BoardList` + `Card` + APIs + tests | Agent after you can repeat the plan |
| [3](./level-3.md) | You state outcomes. You review judgment. | Move, leak, tombstone vs erase | Agent; you are the reviewer |

The schema is where most judgment lives. If you skip level 1, you will approve lists and cards you cannot defend.

Do not ask the agent to switch its own mode. In Cursor, set the chat to **Ask** for level 1. If it offers to edit, stop and keep asking.

## The product (unchanged across levels)

Users in a jurisdiction keep **boards**. A board has ordered **lists** (columns). A list has ordered **cards**. The owner manages their boards. Admin can see them. When the account is erased, this data is physically deleted. Closing a board in the product is a tombstone, not a DSAR wipe.

Keep `Widget` and the platform entities. Add kanban next to them in `stencil-entities.xml`.
