# Level 3 — Outcome specified, judgment reviewed

## Objective

Leave this level able to **ship a vertical slice from product constraints**, with the AI running XML → generate → managers → APIs → tests, while you fail any plan that fights tenancy, leak, erasure, or tests. You do not enumerate fields. You would sign this review on a real Stencil product.

## What this is

In general: **you specify what must be true for a user or for ops; the AI is the author of the whole loop; you are accountable for judgment.** This is the job after the track. Level 1 taught the schema by writing it. Level 2 taught review while the draft was still small. Level 3 teaches *not becoming the typist again* once you can see a bad contract.

You state constraints (privacy, move semantics, close vs erase, tests). You demand a short plan *before* code. You review like a lead: is judgment in XML, or in a parallel model? You stop a run that edits `*.manager.base.ts` or invents a second store. You do not spec every field “so it cannot go wrong” — that is level 2 forever.

**Cursor:** Agent mode is expected. Approve the system, not the volume of diff.

## This kanban

Boards, lists, and cards already exist. Add behavior, not a new app. Give the AI these outcomes (and nothing more specific unless it asks):

1. **Move.** An owner can move a card to another list on the same board. That write must not clobber title or description (perspectives, not `replace`).
2. **Leak.** Card list/detail for other members (or Public) must not include the owner’s email or `auth_identifier`. Use a projection; do not omit fields ad hoc in the controller.
3. **Close vs erase.** Archiving or closing a board is a tombstone (`deleted_utc`, and `edited_utc` if you sync). Deleting the **account** still physically deletes boards, lists, and cards through the erasure registry. Do not use one mechanism for both.
4. **Members (optional if the plan stays honest).** A board can have more than the owner. If you add members, say how DSAR treats them (`hosted` / `referenced`, implemented on `*.manager.ts`). If you skip members, say so in the plan — do not leave a silent hole.
5. **Tests.** E2E for move, for the public/member shape, for archive vs owner-delete, and 4xx without auth.

`owned` bulk-delete is generated on the manager base. `custom` / `hosted` / blob cleanup is code you write on `*.manager.ts`; `eraseAccount` calls it. Skip tests because the XML “looks right” and you are not done.

## Kickstarters

Open with outcomes. Do not paste a field list.

> Our kanban already has Board, lists, and cards. I want an owner to move a card to another list on the same board without clobbering the card’s title or description. I want list/detail payloads that other people can see to never include the owner’s email or auth identifier. Closing or archiving a board should tombstone it; deleting the account should still physically delete boards, lists, and cards. Propose tenant, projections, perspectives, accountDeletion, features, and tests first. Do not implement until I agree the plan does not fight the platform.

If you want members in this slice:

> I also want a board to have members besides the owner. Include how DSAR treats member rows. If members are out of scope, say that explicitly in the plan.

Then, as reviewer:

> Before you code: is any of this a handwritten getter XML already has? Are writes perspectives or replace? Where does /v1 get jurisdiction_id?

> Show me the projection that proves email cannot appear on a card list. If the controller is “just omitting” fields, that is not approved.

> Show me that archive/close sets deleted_utc (and edited_utc if federated) and that account erasure still physically deletes. Those must be different code paths.

> Implement only after that plan. Then add E2E: move card; public/member shape has no email; archive vs eraseAccount; unauthenticated 4xx.

Fail the review if judgment lives in a parallel TypeScript model, if a new collection has no erasure stance, or if tests only cover the happy path.

## Attest when the track is done

You are ready to review Stencil work without this track when every box is true and you can answer every question **out loud**. This is the bar you would use on a product that was not a tutorial.

### What you did

- [ ] I stated outcomes (move, leak, close vs erase, tests). I did not hand the model a field list.
- [ ] I rejected a plan that fought the platform, or I can say what would have made me reject it.
- [ ] I can name the tests that prove move, the public shape, archive versus account erase, and 4xx without auth.
- [ ] I can explain the slice from the XML and those test names, without reading generated bases line by line.

### What you can explain

- [ ] Why “the controller will just omit email” is not a projection.
- [ ] Why archive (`deleted_utc`, and `edited_utc` if the row syncs) and `eraseAccount` are different code paths.
- [ ] What the generator does for `owned`, and what you still have to write for `custom`, `hosted`, or blob cleanup.
- [ ] Where `/v1` gets `jurisdiction_id`, and why a body or route jurisdiction on a user route is rejected.
- [ ] Why a large, correct generate is acceptable, and a small edit to `*.manager.base.ts` is not.

### Questions

1. The plan adds `BoardMember` and does not mention DSAR. What do you require before any code?
2. Move is implemented as `replace` of the whole card. What breaks, and what do you send back?
3. Tests pass for “owner moves their own card.” What else has to be red before you approve?
4. Someone asks you to spec every column “so the model cannot go wrong.” Which level is that, and why do you refuse?
