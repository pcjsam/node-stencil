# Account Erasure (DSAR)

Normal deletes are tombstones (`deleted_utc`). Physical removal is a separate **account-erasure** path. The XML schema owns that path: every collection declares `accountDeletion`, the generator emits a registry, and a walker calls managers in order.

Do not invent a second list of “tables to wipe” in a feature service.

## Contract

1. Edit `accountDeletion` (and `accountOwner` / phase / handlers) on the `<item>`.
2. Run the generator. `entities/account-deletion-manager.ts` is rewritten every run — never edit it.
3. Implement methods on `*.manager.ts` only when the mode is not a simple owner filter (`hosted`, `referenced`, `paired` local `$or`, `custom`, `released`, blob cleanup).
4. Call `AccountDeletionService.eraseAccount(jurisdiction_id, account_id, auth_identifier)` from a DSAR processor you own. Confirmation, export, and audit records stay in product code.

## Generated registry

`AccountDeletionManagerRegistry` exposes:

| Method | Source XML |
|--------|------------|
| `getGeneratedManagers` | Items with `accountDeletionPhase` (must implement `deleteAllForAccount`) |
| `getGeneratedReleasedManagers` | `accountDeletion="released"` + `releaseHandler` |
| `getGeneratedAuthDeletionManagers` | `accountDeletion="custom"` + `deletionHandler` (`auth_identifier`) |
| `getGeneratedFederatedManagers` | `accountDeletion="paired"` — remote hook on a handler you implement |

`owned` generates `deleteAllForAccount` on the manager base: filter `{ [accountOwner field]: account_id }`, then `_deleteManyIsolated` / `_deleteManyShared`. Queryable Encryption collections cannot `deleteMany`; the helper uses per-id `deleteOne` bulkWrite when the schema has encrypted fields.

Override `deleteAllForAccount` on `*.manager.ts` when extra work is required (delete object-storage keys, then `super.deleteAllForAccount`).

## Walker order

`eraseAccount` does not hard-code entity names. It:

1. Runs federated remote deletes if you pass a handler (empty in this clone until paired entities exist).
2. Runs phased managers sorted by `accountDeletionOrder`.
3. Runs release handlers.
4. Runs custom auth-mapping deletes.
5. Revokes the identity-provider user (`IAuthProvider.revokeUser`).

Put storage/asset rows at a lower order than the account row. Phase strings are labels for humans and for grouping logs; order is what the walker uses.

## Modes (do not skip)

| Mode | Generate `deleteAllForAccount`? | In the plan? |
|------|----------------------------------|--------------|
| `owned` | Yes, from `accountOwner` | If `accountDeletionPhase` is set |
| `none` | No | No |
| `retained` | No | No (`retainReason` is documentation) |
| `custom` | No | Auth list via `deletionHandler` |
| `released` | No | Release list via `releaseHandler` |
| `paired` | No (local filter is usually `$or` on both sides) | Phase list **and** federated hook. Implement local `deleteAllForAccount` on `*.manager.ts`. |
| `hosted` / `referenced` / `embedded` | No | Phase list if you set a phase. Implement it on `*.manager.ts`. |

`accountSubject` and `accountEmbedded` are review annotations. The generator does not read them.

## This clone

| Item | Stance |
|------|--------|
| Timezone, Role, GlobalSetting, Jurisdiction, JurisdictionSetting, Widget | `none` |
| JurisdictionAsset | `owned` on `account_id_creator`, phase `storage`, order 10. `jurisdictionasset.manager.ts` deletes blobs then `super`. |
| Account | `owned` on `_id`, phase `account`, order 20 |
| GlobalAccount | `custom` `deleteByAuthIdentifier` |

Widget has no account field, so `none` is correct. When a domain collection becomes account-owned, add `account_id`, `accountOwner`, a phase, and regenerate — do not add a one-off `deleteMany` in a controller.

## What stays product

Request queues, confirmation mail, data-export zips, Apple/inbound-email intake, and named “90-day handle lock” policies. Those call `eraseAccount`. They are not XSL.
