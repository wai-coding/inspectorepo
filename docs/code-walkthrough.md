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

`buildMarkdownReport(report)` — produces full markdown with header, summary table, issues table, and per-file detail sections with proposed patches.

### `src/scanner.ts`

File filtering utilities: `isAnalyzableFile(name)` and `filterAnalyzableFiles(names)`.

### `src/file-filter.ts`

Exclude rules and directory tree utilities: `isExcludedDir`, `filterExcludedPaths`, `buildDirectoryTree`, `pickDefaultDirs`, `filterBySelectedDirs`.

### `src/rules/index.ts`

Registry exporting all rules and the `allRules` array.

### `src/rules/unused-imports.ts`

Detects unused import specifiers using `findReferencesAsNodes()`. Handles default, namespace, and named imports. Skips side-effect imports. Proposes removing unused specifiers or entire imports.

### `src/rules/complexity-hotspot.ts`

Counts control-flow complexity per function: if/else, switch cases, ternaries, logical operators, loops, try/catch, plus nesting depth bonus. Flags functions scoring ≥ 12.

### `src/rules/optional-chaining.ts`, `boolean-simplification.ts`, `early-return.ts`

Stub rules returning empty arrays. Specs defined in `docs/architecture-and-rules.md`.

### `src/rules/placeholder.ts`

Legacy no-op rule. Kept for backward compatibility.

### `src/analyzer.test.ts`

15 tests: scanner filtering, analyzeCodebase pipeline, unused-imports detection (full/partial/used/side-effect), complexity threshold behavior, markdown report generation.

### `src/file-filter.test.ts`

16 tests covering exclude rules, path filtering, directory tree building, default selection, and filtering by selected directories.

---

## `apps/web`

Vite + React + TypeScript frontend with a VSCode-like layout.

### `src/main.tsx`

App entry point. Renders `<App />` into `#root`.

### `src/App.tsx`

Root layout. Composes `TopBar`, `Sidebar`, `MainPanel`, `DetailsPanel`. Passes `report`, `selectedIssue`, `selectIssue`, and `exportMarkdown` to children.

### `src/folder-reader.ts`

Browser folder input abstraction:
- `selectFolderViaAPI()` — File System Access API, reads `.ts/.tsx` file content inline during traversal
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

Right panel showing selected issue details: severity badge, rule id, file location, message, suggestion summary/details, and proposed patch with copy button.

### `src/styles/global.css`

Dark theme with CSS custom properties. Styles for: layout, top bar (summary badge), issue toolbar (filter buttons, search), issue list rows, detail panel sections, proposed patch code block.
