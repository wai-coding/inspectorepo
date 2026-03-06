# InspectoRepo Analysis Report

**Generated:** 2026-03-06 00:22:26 UTC
**Files analyzed:** 4
**Directories:** src

## Summary

| Metric | Value |
|---|---|
| Score | **64/100** |
| Total issues | 12 |
| 🔴 Errors | 0 |
| 🟡 Warnings | 4 |
| 🔵 Info | 8 |

## Issues

| | Severity | Rule | File | Line |
|---|---|---|---|---|
| 🟡 | warn | complexity-hotspot | src/data-processor.ts | 4 |
| 🟡 | warn | unused-imports | src/api-client.ts | 2 |
| 🟡 | warn | unused-imports | src/api-client.ts | 4 |
| 🟡 | warn | unused-imports | src/data-processor.ts | 1 |
| 🔵 | info | boolean-simplification | src/user-utils.ts | 40 |
| 🔵 | info | boolean-simplification | src/user-utils.ts | 44 |
| 🔵 | info | boolean-simplification | src/user-utils.ts | 51 |
| 🔵 | info | boolean-simplification | src/user-utils.ts | 55 |
| 🔵 | info | boolean-simplification | src/user-utils.ts | 59 |
| 🔵 | info | optional-chaining | src/user-utils.ts | 20 |
| 🔵 | info | optional-chaining | src/user-utils.ts | 27 |
| 🔵 | info | optional-chaining | src/user-utils.ts | 32 |

## Details

### src/data-processor.ts

🟡 **WARN** — `complexity-hotspot` (line 4)

Function "processRecords" has a complexity score of 72 (threshold: 12).

> 💡 Consider reducing complexity.

---

🟡 **WARN** — `unused-imports` (line 1)

Unused import: entire import from 'events' is unused.

> 💡 Remove the entire import from 'events'.

<details>
<summary>Proposed fix</summary>

```diff
- import { EventEmitter } from 'events';
```

</details>

### src/api-client.ts

🟡 **WARN** — `unused-imports` (line 2)

Unused import: entire import from './logger' is unused.

> 💡 Remove the entire import from './logger'.

<details>
<summary>Proposed fix</summary>

```diff
- import { Logger } from './logger';
```

</details>

---

🟡 **WARN** — `unused-imports` (line 4)

Unused import: entire import from './config' is unused.

> 💡 Remove the entire import from './config'.

<details>
<summary>Proposed fix</summary>

```diff
- import * as config from './config';
```

</details>

### src/user-utils.ts

🔵 **INFO** — `boolean-simplification` (line 40)

Simplify `user.active === true` to `user.active`.

> 💡 Simplify `user.active === true` to `user.active`.

<details>
<summary>Proposed fix</summary>

```diff
- user.active === true
+ user.active
```

</details>

---

🔵 **INFO** — `boolean-simplification` (line 44)

Simplify `user.disabled !== false` to `user.disabled`.

> 💡 Simplify `user.disabled !== false` to `user.disabled`.

<details>
<summary>Proposed fix</summary>

```diff
- user.disabled !== false
+ user.disabled
```

</details>

---

🔵 **INFO** — `boolean-simplification` (line 51)

Double negation `!!value` can be simplified to `Boolean(value)`.

> 💡 Replace `!!value` with `Boolean(value)` for clarity.

<details>
<summary>Proposed fix</summary>

```diff
- !!value
+ Boolean(value)
```

</details>

---

🔵 **INFO** — `boolean-simplification` (line 55)

Ternary `user.loggedIn ? true : false` can be simplified to `user.loggedIn`.

> 💡 Simplify ternary to `user.loggedIn`.

<details>
<summary>Proposed fix</summary>

```diff
- user.loggedIn ? true : false
+ user.loggedIn
```

</details>

---

🔵 **INFO** — `boolean-simplification` (line 59)

Ternary `user.guest ? false : true` can be simplified to `!user.guest`.

> 💡 Simplify ternary to `!user.guest`.

<details>
<summary>Proposed fix</summary>

```diff
- user.guest ? false : true
+ !user.guest
```

</details>

---

🔵 **INFO** — `optional-chaining` (line 20)

Guard chain can use optional chaining: `user?.profile?.avatar?.url`

> 💡 Replace with optional chaining: `user?.profile?.avatar?.url`

<details>
<summary>Proposed fix</summary>

```diff
- user.profile && user.profile.avatar && user.profile.avatar.url
+ user?.profile?.avatar?.url
```

</details>

---

🔵 **INFO** — `optional-chaining` (line 27)

Guard chain can use optional chaining: `user?.profile?.settings?.theme`

> 💡 Replace with optional chaining: `user?.profile?.settings?.theme`

<details>
<summary>Proposed fix</summary>

```diff
- user.profile && user.profile.settings && user.profile.settings.theme
+ user?.profile?.settings?.theme
```

</details>

---

🔵 **INFO** — `optional-chaining` (line 32)

Guard chain can use optional chaining: `user?.metadata?.lastLogin?.timestamp`

> 💡 Replace with optional chaining: `user?.metadata?.lastLogin?.timestamp`

<details>
<summary>Proposed fix</summary>

```diff
- user.metadata && user.metadata.lastLogin && user.metadata.lastLogin.timestamp
+ user?.metadata?.lastLogin?.timestamp
```

</details>
