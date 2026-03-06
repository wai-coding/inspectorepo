# Code Walkthrough

A guided tour of the InspectoRepo codebase. Organized by package and file, with short explanations and snippets.

---

## Root Configuration

### `package.json`

Root workspace config. Defines npm workspaces (`apps/*`, `packages/*`) and root-level scripts that delegate to workspace packages.

### `tsconfig.base.json`

Shared TypeScript compiler options: `ES2022` target, `bundler` module resolution, strict mode. All packages extend this.

### `tsconfig.json`

Project references file — points `tsc -b` at all three packages for incremental builds.

### `eslint.config.mjs`

Flat ESLint config with TypeScript parser, React Hooks, and React Refresh plugins. Browser globals configured for DOM APIs including `navigator` and `Blob`.

### `vitest.config.ts`

Vitest configured to find test files in `packages/*/src/**/*.test.ts`.

### `LICENSE`

MIT License (copyright 2026 Luis Castro).

---

## `docs/architecture-and-rules.md`

Architecture review for M3 and specifications for the first 5 rules. Key sections:
- **Core architecture review** — package layout, key decisions (VirtualFile input, in-memory ts-morph, deterministic output, centralized excludes, scoring formula), tradeoffs table
- **First 5 rules spec** — `optional-chaining`, `unused-imports`, `boolean-simplification`, `early-return`, `complexity-hotspot` — each with detection, examples, safety constraints, fix format, severity, and implementation approach

This document guides all rule implementation work.

---

## `ai/`

### `repomix-state.json`

Tracked version counter for repomix exports. Contains `{ "currentVersion": N }`. Incremented by the export script after each generation.

### `scripts/generate-repomix-exports.ts`

Node script (run via `npm run repopack`) that:
1. Reads `ai/repomix-state.json` to get the current version
2. Computes `nextVersion = currentVersion + 1`
3. Runs `npx repomix` with ignore rules matching `.gitignore` + additional exclusions
4. Gathers git info: last 10 commits, files changed, latest merge
5. Writes `ai/exports/repo-pack-vN.md` and `ai/exports/changes-summary-vN.md`
6. Updates `ai/repomix-state.json` with the new version

The generated files under `ai/exports/` are git-ignored and never committed.

### `exports/`

Git-ignored directory containing generated repomix exports (`repo-pack-vN.md`, `changes-summary-vN.md`). These are uploaded to ChatGPT for review after each milestone merge.

---

## `examples/`

### `fixture-repo/`

Sample TypeScript files designed to trigger all 4 implemented rules when analyzed:
- `src/api-client.ts` — unused imports (Logger, formatPercentage, config namespace)
- `src/data-processor.ts` — complexity hotspot (deeply nested control flow, score 72) + unused EventEmitter
- `src/user-utils.ts` — optional chaining (3 guard chains) + boolean simplification (5 patterns)
- `src/formatters.ts` — clean utility file (import target, no issues)

### `generate-report.ts`

Node script that collects fixture files, runs `analyzeCodebase()`, and writes `sample-report.md`. Uses `readFileSync` + `readdirSync` to walk the fixture directory.

### `sample-report.md`

Generated Markdown report: 12 issues, score 64/100, covering all 4 rules with proposed diffs.

---

## `screenshots/`

### `capture.ts`

Playwright script for automated UI screenshot capture. Launches Chromium, navigates to dev server, injects fixture files via `__inspectorepo_loadFolder` dev global, runs analysis, selects an issue, and saves `ui-layout.png`.

### `record-demo.ts`

Playwright script that records a full demo workflow as `demo.webm`: load files → analyze → click through issues → filter → back to all.

### `ui-layout.png`

Main UI screenshot showing the VSCode-like dark interface with sidebar, issue list, and detail panel.

### `demo.webm`

Recorded demo video of the analysis workflow.

---

## `packages/shared`

Shared type definitions used by both `core` and `web`.

### `src/types.ts`

Core data types:

- `Severity` — `'info' | 'warn' | 'error'`
- `Position` — `{ line, column }`
- `Range` — `{ start: Position, end: Position }`
- `Suggestion` — `{ summary, details, proposedPatch?, proposedDiff? }`
- `Issue` — `{ id, ruleId, severity, message, filePath, range, suggestion }`
- `VirtualFile` — `{ path, content }`
- `AnalysisSummary` — `{ totalIssues, bySeverity, score }`
- `AnalysisMeta` — `{ analyzedFilesCount, analyzedDirectories }`
- `AnalysisReport` — `{ summary, issues, meta }`

### `src/index.ts`

Re-exports all types from `types.ts`.

---

## `packages/core`

The analysis engine. Parses files, runs rules, computes scores, generates reports.

### `src/index.ts`

Public API surface: `analyzeCodebase`, `buildMarkdownReport`, `computeScore`, all rules, file-filter utilities, scanner.

### `src/analyzer.ts`

Main analysis pipeline entry point:

```ts
analyzeCodebase({ files, selectedDirectories, options? }): AnalysisReport
```

Filters files (selected dirs → excludes → .ts/.tsx), sorts paths for determinism, creates in-memory ts-morph `Project`, runs all rules on each source file, sorts issues by severity → ruleId → filePath → line → column.

### `src/rule.ts`

Rule and context interfaces:

```ts
interface RuleContext { sourceFile: SourceFile; filePath: string; }
interface Rule { id: string; title: string; severity: Severity; run(ctx: RuleContext): Issue[]; }
```

### `src/scoring.ts`

`computeScore(issues)` — base 100, subtract per-issue penalties (error: −10, warn: −5, info: −2), floor at 0. Returns `AnalysisSummary`.

### `src/report.ts`

`buildMarkdownReport(report)` — produces full markdown with header, summary table (with severity emojis 🔴🟡🔵), issues table (emoji column), and per-file detail sections. Each issue shows `emoji **SEVERITY** — \`ruleId\` (line N)`, a `> 💡` suggestion prefix, and collapsible `<details>` blocks for proposed diffs. Issues in the same file are separated by `---` horizontal rules. Prefers `proposedDiff` over `proposedPatch`.

### `src/scanner.ts`

File filtering utilities: `isAnalyzableFile(name)` and `filterAnalyzableFiles(names)`.

### `src/file-filter.ts`

Exclude rules and directory tree utilities: `isExcludedDir`, `filterExcludedPaths`, `buildDirectoryTree`, `pickDefaultDirs`, `filterBySelectedDirs`, `normalizeRelativePath`.

### `src/rules/index.ts`

Registry exporting all rules and the `allRules` array.

### `src/rules/unused-imports.ts`

Detects unused import specifiers using `findReferencesAsNodes()`. Handles default, namespace, and named imports separately, tracking which category each specifier falls into. Patch generation logic:
- All unused → remove entire import line
- Default kept + some named kept → `import Default, { named } from '...'`
- Only named kept → `import { named } from '...'`
- Only default kept → `import Default from '...'`
- Only namespace kept → `import * as NS from '...'`
- Complex combinations (default+namespace, namespace+named) → text-only suggestion, no code patch

Skips side-effect imports (`import './polyfill'`).

### `src/rules/complexity-hotspot.ts`

Counts control-flow complexity per function: if/else, switch cases, ternaries, logical operators, loops, try/catch, plus nesting depth bonus. Flags functions scoring ≥ 12.

### `src/rules/optional-chaining.ts`

Detects monotonic `&&` guard chains and suggests optional chaining. Implementation:
1. `flattenAndChain()` — recursively flattens left-associative `&&` binary expressions into an array of operands.
2. `getAccessChain()` — extracts a property access chain from an expression (e.g., `a.b.c` → `['a', 'b', 'c']`). Returns null for non-simple expressions (calls, element access).
3. `isMonotonicChain()` — verifies each operand extends the previous by exactly one segment.
4. Only reports on the outermost `&&` chain (skips inner nodes of already-reported chains, skips nodes whose parent is also `&&`).

### `src/rules/boolean-simplification.ts`

Detects three redundant boolean patterns:
1. **Comparison to boolean literals** — `x === true`, `x === false`, `x !== true`, `x !== false` (strict equality only). Also handles reversed form (`true === x`).
2. **Double negation** — `!!x` detected as nested `PrefixUnaryExpression` with `!` operators. Suggests `Boolean(x)`.
3. **Ternary returning boolean literals** — `x ? true : false` → `x`, `x ? false : true` → `!x`.

### `src/rules/early-return.ts`

Stub rule returning empty arrays. Spec defined in `docs/architecture-and-rules.md`.

### `src/rules/placeholder.ts`

Legacy no-op rule. Kept for backward compatibility.

### `src/analyzer.test.ts`

15 tests: scanner filtering, analyzeCodebase pipeline, unused-imports detection (full/partial/used/side-effect), complexity threshold behavior, markdown report generation.

### `src/file-filter.test.ts`

16 tests covering exclude rules, path filtering, directory tree building, default selection, and filtering by selected directories.

---

## `packages/cli`

Headless CLI for terminal-based codebase analysis. Thin wrapper around `@inspectorepo/core`.

### `src/index.ts`

Bin entry point (`#!/usr/bin/env node`). Passes `process.argv.slice(2)` to `run()`.

### `src/cli.ts`

Main CLI logic:
- `parseArgs(args)` — parses `analyze <path>` plus `--dirs`, `--format`, `--out`, `--max-issues`, `--help` options. Returns `CliOptions` or `null` on error.
- `run(args)` — resolves the target path, reads files via `readFilesFromDisk()`, filters by selected dirs, calls `analyzeCodebase()`, formats output as markdown or JSON, writes to file or stdout.

### `src/fs-reader.ts`

Node filesystem utilities:
- `readFilesFromDisk(rootDir)` — recursively walks directories using `readdirSync`, skips excluded dirs via `isExcludedDir()`, collects `.ts/.tsx` files as `VirtualFile[]` with content. Results sorted by path for determinism.
- `parseDirs(input)` — splits comma-separated directory string into array, trims whitespace.
- `filterByDirs(files, dirs)` — filters `VirtualFile[]` to only files under specified directories. Returns all files when dirs is empty.

### `src/cli.test.ts`

9 tests: `parseDirs` (comma split, whitespace trim, empty input, single dir) and `filterByDirs` (empty dirs, single dir filter, multiple dirs, no match, partial prefix rejection).

---

## `apps/web`

Vite + React + TypeScript frontend with a VSCode-like layout.

### `src/main.tsx`

App entry point. Renders `<App />` into `#root`.

### `src/App.tsx`

Root layout. Composes `TopBar`, `Sidebar`, `MainPanel`, `DetailsPanel`. Passes `report`, `selectedIssue`, `selectIssue`, and `exportMarkdown` to children.

### `src/folder-reader.ts`

Browser folder input abstraction:
- `selectFolderViaAPI()` — File System Access API using `handle.entries()` for robust cross-browser iteration. Filters excluded directories early via `isExcludedDir()` during traversal. Reads `.ts/.tsx` file content inline.
- `readUploadedFiles(fileList)` — fallback using `<input webkitdirectory>`, reads file content via `File.text()`
- `processFiles(files)` — applies exclude rules and TS/TSX filter

Both methods return `{ name, files: VirtualFile[] }` with actual file content populated.

### `src/useAppState.ts`

Central state hook managing folder, files, dirs, report, and selected issue. Key functions:
- `handleAnalyze` — calls `analyzeCodebase()` from core
- `selectIssue` — sets the currently selected issue for the detail panel
- `exportMarkdown` — calls `buildMarkdownReport()` and triggers browser download

### `src/components/TopBar.tsx`

Header bar with score badge, issue/file counts, folder actions, Analyze button, and Export .md button.

### `src/components/Sidebar.tsx`

Left panel with directory tree checkboxes.

### `src/components/MainPanel.tsx`

Center panel. Shows:
- Placeholder before analysis
- "No issues found" + score when clean
- Severity filter buttons (All/Errors/Warnings/Info) + search input
- Clickable issue rows (severity, rule, file:line, message)

### `src/components/DetailsPanel.tsx`

Right panel showing selected issue details. Uses a tabbed layout with **Suggestion** and **Diff** tabs (via `useState<DetailTab>`). The Suggestion tab shows the summary and details; the Diff tab shows the proposed fix in a `<pre>` block with a Copy button. Prefers `proposedDiff` over `proposedPatch`. The Diff tab only appears when a diff is available.

### `src/styles/global.css`

Dark theme with CSS custom properties. Styles for: layout, top bar (summary badge), issue toolbar (filter buttons, search), issue list rows, detail panel tabs (`.detail-tabs`, `.detail-tab`, `.detail-tab.active` with accent underline), detail panel sections, proposed patch code block.
