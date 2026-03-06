# InspectoRepo Analysis Report

**Generated:** 2026-03-05 23:56:17 UTC
**Files analyzed:** 4
**Directories:** src

## Summary

| Metric | Value |
|---|---|
| Score | **64/100** |
| Total issues | 12 |
| Errors | 0 |
| Warnings | 4 |
| Info | 8 |

## Issues

| Severity | Rule | File | Line |
|---|---|---|---|
| warn | complexity-hotspot | src/data-processor.ts | 4 |
| warn | unused-imports | src/api-client.ts | 2 |
| warn | unused-imports | src/api-client.ts | 4 |
| warn | unused-imports | src/data-processor.ts | 1 |
| info | boolean-simplification | src/user-utils.ts | 40 |
| info | boolean-simplification | src/user-utils.ts | 44 |
| info | boolean-simplification | src/user-utils.ts | 51 |
| info | boolean-simplification | src/user-utils.ts | 55 |
| info | boolean-simplification | src/user-utils.ts | 59 |
| info | optional-chaining | src/user-utils.ts | 20 |
| info | optional-chaining | src/user-utils.ts | 27 |
| info | optional-chaining | src/user-utils.ts | 32 |

## Details

### src/data-processor.ts

**WARN** — complexity-hotspot (line 4)

Function "processRecords" has a complexity score of 72 (threshold: 12).

> Consider reducing complexity.

**WARN** — unused-imports (line 1)

Unused import: entire import from 'events' is unused.

> Remove the entire import from 'events'.

```diff
- import { EventEmitter } from 'events';
```

### src/api-client.ts

**WARN** — unused-imports (line 2)

Unused import: entire import from './logger' is unused.

> Remove the entire import from './logger'.

```diff
- import { Logger } from './logger';
```

**WARN** — unused-imports (line 4)

Unused import: entire import from './config' is unused.

> Remove the entire import from './config'.

```diff
- import * as config from './config';
```

### src/user-utils.ts

**INFO** — boolean-simplification (line 40)

Simplify `user.active === true` to `user.active`.

> Simplify `user.active === true` to `user.active`.

```diff
- user.active === true
+ user.active
```

**INFO** — boolean-simplification (line 44)

Simplify `user.disabled !== false` to `user.disabled`.

> Simplify `user.disabled !== false` to `user.disabled`.

```diff
- user.disabled !== false
+ user.disabled
```

**INFO** — boolean-simplification (line 51)

Double negation `!!value` can be simplified to `Boolean(value)`.

> Replace `!!value` with `Boolean(value)` for clarity.

```diff
- !!value
+ Boolean(value)
```

**INFO** — boolean-simplification (line 55)

Ternary `user.loggedIn ? true : false` can be simplified to `user.loggedIn`.

> Simplify ternary to `user.loggedIn`.

```diff
- user.loggedIn ? true : false
+ user.loggedIn
```

**INFO** — boolean-simplification (line 59)

Ternary `user.guest ? false : true` can be simplified to `!user.guest`.

> Simplify ternary to `!user.guest`.

```diff
- user.guest ? false : true
+ !user.guest
```

**INFO** — optional-chaining (line 20)

Guard chain can use optional chaining: `user?.profile?.avatar?.url`

> Replace with optional chaining: `user?.profile?.avatar?.url`

```diff
- user.profile && user.profile.avatar && user.profile.avatar.url
+ user?.profile?.avatar?.url
```

**INFO** — optional-chaining (line 27)

Guard chain can use optional chaining: `user?.profile?.settings?.theme`

> Replace with optional chaining: `user?.profile?.settings?.theme`

```diff
- user.profile && user.profile.settings && user.profile.settings.theme
+ user?.profile?.settings?.theme
```

**INFO** — optional-chaining (line 32)

Guard chain can use optional chaining: `user?.metadata?.lastLogin?.timestamp`

> Replace with optional chaining: `user?.metadata?.lastLogin?.timestamp`

```diff
- user.metadata && user.metadata.lastLogin && user.metadata.lastLogin.timestamp
+ user?.metadata?.lastLogin?.timestamp
```
