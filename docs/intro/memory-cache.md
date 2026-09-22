# Memory cache

`MemoryCache` (`server/api/backend/src/shared/cache/memory-cache.ts`) keeps a few hot reads in the Node process so the same lookup does not hit Mongo on every request.

It is a `Map` with a time-to-live. It is not Redis, and it is not shared across API processes. Each running instance has its own map. A value saved on one task is invisible to the others.

HTTP ETags are turned off in `main.ts`. Caching is an explicit manager call, not a header the client negotiates.

## Why it exists

Some reads happen on almost every authenticated request, and the stored row changes rarely:

| Caller | What is cached | TTL |
|--------|----------------|-----|
| `RoleManager.getPermissionsForRoleCached` | Permission list for a role name | 15 minutes |
| `GlobalSettingManager` / `JurisdictionSettingManager` cached getters | A setting value | 15 minutes |
| `AccountManager.ensureFromRequestCached` | Account resolved from the auth subject | 1 minute |
| `CloudStorageHandler` | Storage config and signed URLs | 15 minutes |

`hasPermissionCached` walks roles through that 15-minute permission cache. Without it, every guarded route would load the role documents again.

The methods are `getOrFetch1`, `getOrFetch5`, and `getOrFetch15` (1, 5, and 15 minutes). `set` without a TTL uses 5 minutes.

## How a read works

```typescript
const cached = await this.memoryCache.getOrFetch15(
   `RoleManager:getPermissionsForRole:${role_name}`,
   () => this.getPermissionsForRole(role_name)
);
return cached.value;
```

1. If the key is present and not expired, return it. `fromCache` is true.
2. If a fetch for that key is already running, wait for that same promise. A burst of identical requests shares one Mongo read.
3. Otherwise run the fetch, store the result, and return it. `fromCache` is false.

The key is part of the contract. Include every part of the lookup. A jurisdiction setting key includes `jurisdiction_id` and the setting name so one tenant cannot receive another tenant’s value. A role key is the role name because `Role` is shared.

Do not log a key that contains a Firebase UID, `auth_identifier`, or JWT `sub`. The account cache key includes the subject.

`AccountManager.ensureFromRequestCached` treats a cached empty result as a miss and reads again. A brand-new account must not stay invisible for the rest of the minute.

## What it does not do

A write does not clear the cache. Nothing in this repository calls `memoryCache.clear`. After you change a global setting or a role’s permissions, readers can keep the previous value until the TTL ends, and each process expires on its own clock.

That is acceptable for these lookups because the TTL is short and the rows are read far more often than they are written. Do not put a value here if the next request must see the write. Read it from the manager without the cached getter.

Expired entries are dropped when read. `CacheCleanupService` also walks the map once a minute on every process (API and tasks) so unused keys do not sit until something asks for them.

## Where to add one

Call `this.memoryCache` from the extension manager (`role.manager.ts`, `globalsetting.manager.ts`), not from a controller and not from a file the generator rewrites. Name the uncached method, then a `…Cached` method that wraps it. Pick the TTL from how stale the answer is allowed to be: account resolution uses 1 minute; role permissions and settings use 15.
