# Architecture & Rules — M3

## Core architecture review (M3)

### Package layout

```
packages/core/src/
├── index.ts              # Public API: analyzeCodebase, buildMarkdownReport, re-exports
├── types.ts              # Local type aliases (re-exports from shared where useful)
├── scanner.ts            # isAnalyzableFile, filterAnalyzableFiles
├── file-filter.ts        # Exclude rules, directory tree, path filtering
├── analyzer.ts           # analyzeCodebase() — main pipeline entry point
├── scoring.ts            # computeScore(issues) → { score, bySeverity }
├── report.ts             # buildMarkdownReport(AnalysisReport) → string
├── rule.ts               # Rule interface definition
└── rules/
    ├── index.ts           # Registry: allRules array
    ├── unused-imports.ts
    ├── complexity-hotspot.ts
    ├── optional-chaining.ts   (stub in M3)
    ├── boolean-simplification.ts (stub in M3)
    └── early-return.ts        (stub in M3)
```

### Key decisions

**1. VirtualFile[] as main input — browser-friendly**

The core analysis engine never touches the filesystem. The public API accepts `VirtualFile[]` (`{ path: string; content: string }`). This keeps core importable from a browser bundle (the web app) without polyfilling Node's `fs`. Any filesystem access (directory picker, file reading) lives in `apps/web` or a future CLI adapter.

**2. Filesystem adapters live outside core**

`apps/web/src/folder-reader.ts` already handles File System Access API and `<input webkitdirectory>`. A future CLI package would use Node `fs` to produce the same `VirtualFile[]` shape. Core doesn't care where the bytes come from.

**3. Deterministic output**

Same `VirtualFile[]` input → same `AnalysisReport` output. This means:
- Sort file paths before processing.
- Sort issues before returning: severity (error > warn > info), then rule id, then file path, then line, then column.
- No randomness, no timestamps in the report model (timestamps only in serialization / markdown export if needed).

**4. Single ts-morph Project for all files**

Create one `ts-morph.Project` with `useInMemoryFileSystem: true`, add all VirtualFiles as source files, then iterate. This avoids redundant type-checking passes and keeps memory bounded. If a file fails to parse, catch the error and skip it (log a warning issue).

**5. Shared exclude patterns**

`file-filter.ts` in core defines the canonical exclude list (`EXCLUDED_DIRS`). Both web and core import from core. Web uses it during folder reading; core uses it as a safety net before analysis.

**6. Scoring is simple and transparent**

Base 100, subtract per-issue penalties (error: −10, warn: −5, info: −2), floor at 0. Easy to reason about, easy to explain in the report.

### Tradeoffs

| Decision | Upside | Downside |
|---|---|---|
| In-memory ts-morph | No filesystem dependency, works in browser | Higher memory for large codebases |
| Single Project | Accurate cross-file type info | Slower initial setup for many files |
| Simple linear scoring | Easy to understand and test | Doesn't weight rule importance |
| VirtualFile with full content | Simple API, no async streaming | Caller must load all files upfront |

---

## First 5 rules (spec)

### 1. `optional-chaining`

| Field | Value |
|---|---|
| **Rule id** | `optional-chaining` |
| **Severity** | `info` |
| **What it detects** | Property access or method calls guarded by manual null checks that could use optional chaining (`?.`). Pattern: `if (x && x.y)`, `x && x.y.z`, `x != null && x.prop`. |
| **Examples** | `if (user && user.name)` → `if (user?.name)` · `obj && obj.method()` → `obj?.method()` |
| **Safety constraints** | Do NOT suggest when the guard has side effects, when the expression is inside a type narrowing block that downstream code depends on, or when the left side is not a simple identifier or member expression. Only suggest for `&&` guards, not ternaries or `if` blocks with else branches. |
| **Suggested fix format** | Text explanation + proposed code snippet. Diff only when the replacement is a single expression. |
| **Implementation approach** | AST: find `BinaryExpression` with `&&` operator where left is identifier/property-access and right accesses same base. Also check `IfStatement` conditions with same pattern. |

### 2. `unused-imports`

| Field | Value |
|---|---|
| **Rule id** | `unused-imports` |
| **Severity** | `warn` |
| **What it detects** | Import declarations or individual import specifiers that are never referenced in the file body. Includes: named imports, default imports, namespace imports. |
| **Examples** | `import { useState, useEffect } from 'react'` where `useEffect` is never used → suggest removing `useEffect` from the import. `import fs from 'fs'` where `fs` is never used → suggest removing entire import. |
| **Safety constraints** | Do NOT flag imports used only for side effects (e.g., `import './polyfill'`). Do NOT flag type-only imports in `.d.ts` files. When a named import has both used and unused specifiers, suggest removing only the unused ones. |
| **Suggested fix format** | Proposed patch showing the cleaned import statement, or removal of the entire declaration. |
| **Implementation approach** | Use ts-morph: iterate `ImportDeclaration` nodes, check each specifier's `findReferencesAsNodes()`. If no references beyond the import itself, it's unused. Fall back to TS diagnostics code `6133` / `6196` if available. |

### 3. `boolean-simplification`

| Field | Value |
|---|---|
| **Rule id** | `boolean-simplification` |
| **Severity** | `info` |
| **What it detects** | Redundant boolean expressions: `x === true`, `x === false`, `!!x` in boolean context, `x ? true : false`, `if (x) return true; else return false;`. |
| **Examples** | `if (isValid === true)` → `if (isValid)` · `return !!value ? a : b` → `return value ? a : b` · `return x ? true : false` → `return x` |
| **Safety constraints** | Only suggest when the expression is already in a boolean context (condition, logical operator). Do NOT simplify `x === true` when `x` is not a boolean type (could be truthy string). When type information is unavailable, limit to obvious patterns (`=== true`, `=== false`, ternary returning boolean literals). |
| **Suggested fix format** | Text explanation + simplified snippet. |
| **Implementation approach** | AST: find `BinaryExpression` comparing to `true`/`false`, `ConditionalExpression` returning boolean literals, `PrefixUnaryExpression` with `!!`. Check surrounding context for boolean expectation. |

### 4. `early-return`

| Field | Value |
|---|---|
| **Rule id** | `early-return` |
| **Severity** | `info` |
| **What it detects** | Functions where the entire body is wrapped in a single `if` block (or ends with an `else` that could be an early return), causing unnecessary nesting. |
| **Examples** | `function foo(x) { if (x) { /* 20 lines */ } }` → `function foo(x) { if (!x) return; /* 20 lines */ }` |
| **Safety constraints** | Do NOT suggest when the function has a meaningful return value in the else path. Do NOT suggest when the if-block is short (≤ 3 statements). Only target functions, not arbitrary blocks. |
| **Suggested fix format** | Text explanation + snippet showing the inverted guard clause and flattened body. |
| **Implementation approach** | AST: find `FunctionDeclaration` / `ArrowFunction` / `MethodDeclaration` whose body has exactly one statement that is an `IfStatement` with no else, or whose last statement is `if/else` with a simple return in one branch. |

### 5. `complexity-hotspot`

| Field | Value |
|---|---|
| **Rule id** | `complexity-hotspot` |
| **Severity** | `warn` |
| **What it detects** | Functions/methods/components with high cyclomatic-like complexity. Counts: `if`, `else if`, `switch` cases, ternary `?:`, `&&`, `||`, `??`, `for`, `while`, `do`, `try/catch`, plus nesting depth bonus. |
| **Examples** | A React component with 8 ternaries, 3 if-blocks, and 2 loops → score 15 → flagged. |
| **Safety constraints** | This is advisory only. Do NOT suggest auto-refactoring of complex functions — only suggest strategies (extract helper, early returns, split component). Do NOT flag short functions even if they have a few branches. Minimum threshold: 12. |
| **Suggested fix format** | Text summary: "This function has a complexity score of {n}. Consider: extracting helpers, using early returns, splitting into smaller components." No diff. |
| **Implementation approach** | AST: walk each function/method/arrow body, count control-flow nodes, add nesting bonus (+1 per nesting level for nested if/loop). Sum to a score. Flag if ≥ threshold. |
