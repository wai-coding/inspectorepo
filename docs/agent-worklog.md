# Agent Worklog

Development log for InspectoRepo. Each entry describes what was implemented, why, and how to verify.

---

## 2026-03-06 — M5: Standardize proposedDiff, Improve Report & Details Panel

### What was implemented

- **Standardized `proposedDiff`** — all rules (`unused-imports`, `optional-chaining`, `boolean-simplification`) now produce `proposedDiff` instead of `proposedPatch`. Report and DetailsPanel prefer `proposedDiff` with fallback to `proposedPatch`.
- **Improved Markdown report format** — severity emojis (🔴🟡🔵) in summary and issues tables, `> 💡` suggestion prefix, collapsible `<details><summary>Proposed fix</summary>` blocks for diffs, `---` separators between issues in the same file.
- **DetailsPanel tabs** — replaced single-view layout with tabbed UI (`Suggestion` / `Diff`). `useState<DetailTab>` tracks active tab. Diff tab only appears when a diff is available. Copy button on the diff tab.
- **Tab CSS** — `.detail-tabs` flex row, `.detail-tab` with accent-colored underline on `.active`.
- **5 new tests** — `proposedDiff` standardisation test (all rules produce `proposedDiff`), 4 report format tests (severity emojis, collapsible details, separator lines, 💡 prefix).
- **Regenerated sample-report.md** — now reflects the new emoji/collapsible format.
- **Updated docs** — code-walkthrough for report.ts, DetailsPanel, CSS changes.

### Why

Consolidate the diff field naming (`proposedDiff` as the standard), make the Markdown export more visually appealing for recruiter review, and improve the UI detail panel with a clean tabbed layout.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # 56 tests pass

# Regenerate sample report to see new format
npx tsx examples/generate-report.ts
cat examples/sample-report.md
```

### Design decisions

- **`proposedDiff` over `proposedPatch`** — "diff" better describes the unified-diff format we produce. Kept `proposedPatch` fallback for backwards compatibility.
- **Collapsible details** — long diffs would clutter the report; `<details>` keeps it clean on GitHub.
- **Tabs over stacked sections** — reduces visual noise; most users want either the suggestion or the diff, not both simultaneously.
- **Copy button on diff tab only** — the suggestion is prose (no need to copy); the diff is code (often pasted into editors).

---

## 2026-03-05 — Screenshots, Demo Video, Sample Report & Fixture Repo

### What was implemented

- **Fixture repo** (`examples/fixture-repo/`) — 4 TypeScript files crafted to trigger all 4 implemented rules:
  - `api-client.ts` — unused imports (Logger, formatPercentage, config namespace)
  - `data-processor.ts` — complexity hotspot (score 72, deeply nested control flow) + unused EventEmitter import
  - `user-utils.ts` — optional chaining (3 guard chains) + boolean simplification (5 patterns: === true, !== false, !!, ternary true/false, ternary false/true)
  - `formatters.ts` — clean utility file (no issues, needed as import target)
- **Report generator** (`examples/generate-report.ts`) — Node script that runs `analyzeCodebase()` against the fixture repo and writes `examples/sample-report.md`. Output: 12 issues across all 4 rule types, score 64/100.
- **Sample report** (`examples/sample-report.md`) — full Markdown analysis report with summary table, issues table, and per-file details with proposed diffs.
- **Screenshot automation** (`screenshots/capture.ts`) — Playwright script that starts a headless Chromium browser, navigates to the dev server, injects fixture files via a dev-only global, runs analysis, selects an issue, and captures `screenshots/ui-layout.png`.
- **Demo video recording** (`screenshots/record-demo.ts`) — Playwright script that records a full demo workflow (load files → analyze → click issues → filter → back to all) as `screenshots/demo.webm`.
- **Dev-only loader** — added `__inspectorepo_loadFolder` global in `useAppState.ts` (only in dev mode via `import.meta.env.DEV`) for E2E test/screenshot automation.
- **README** — embedded screenshot, added sample report link, updated project structure to include `examples/` and `screenshots/`.
- **ESLint config** — added ignores for `examples/fixture-repo/**`, `screenshots/*.ts`, `examples/*.ts` (intentionally bad code / Node scripts).
- **Web tsconfig** — added `"types": ["vite/client"]` for `import.meta.env.DEV`.

### Why

Recruiter-ready visual proof: the screenshot shows the actual UI with real analysis data, the sample report demonstrates export quality, and the fixture repo provides a reproducible demo scenario.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # 51 tests pass

# Generate sample report
npx tsx examples/generate-report.ts

# Capture screenshot (requires dev server running)
npm run dev &
npx tsx screenshots/capture.ts
```

### Design decisions

- **Fixture repo over random project** — deterministic, covers all rules, no external dependencies.
- **Dev-only global** — avoids polluting production code; Playwright can inject files without filesystem access.
- **ESLint ignores for fixtures** — the fixture files are intentionally bad code; linting them defeats the purpose.
- **WebM over GIF** — Playwright records WebM natively; GIF conversion requires ffmpeg (documented in screenshots/README.md).

---

## 2026-03-05 — M4: Optional Chaining + Boolean Simplification Rules

### What was implemented

- **`optional-chaining` rule** — detects monotonic `&&` guard chains like `a && a.b && a.b.c` and suggests optional chaining (`a?.b?.c`). Flattens left-associative `&&` chains, extracts property access chains, verifies monotonic growth (each operand extends the previous by exactly one segment). Only reports on the outermost chain. Skips chains with function calls or non-simple expressions. Provides proposedPatch with diff.
- **`boolean-simplification` rule** — detects three patterns:
  1. Comparisons to boolean literals: `x === true` → `x`, `x === false` → `!x`, `x !== true` → `!x`, `x !== false` → `x`
  2. Double negation: `!!x` → `Boolean(x)`
  3. Ternaries returning boolean literals: `x ? true : false` → `x`, `x ? false : true` → `!x`
  Each detection provides a proposedPatch.
- **11 new tests** — 5 for optional-chaining (basic chain, triple chain, non-monotonic, function calls, proposedPatch), 6 for boolean-simplification (=== true, === false, !!x, ternary true/false, ternary false/true, non-boolean comparison).
- **README** — updated "Implemented Rules" table and roadmap checklist.
- **Code walkthrough** — documented both rule implementations.

### Why

M4 goal: ship two high-demo rules that show useful, conservative suggestions in the UI. These patterns are common in real TS/React codebases and demonstrate AST analysis capability.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # 51 tests pass
npm run dev         # open browser, analyze a TS project → see optional-chaining and boolean-simplification issues
```

### Design decisions

- **Monotonic chain check** — conservative: only suggests optional chaining when each operand extends the previous by exactly one `.property`. Avoids false positives for complex expressions.
- **No side-effect detection** — function calls in chains are rejected entirely rather than trying to determine purity.
- **Boolean literal comparison only** — we only flag `=== true`/`=== false`, not `== true`, to avoid false positives with truthy/falsy coercion.
- **`Boolean(x)` over `!!x`** — suggested as more explicit alternative, not mandatory.

---

## 2026-03-05 — Hotfixes: Folder traversal, unused-imports patches, README, build script

### What was implemented

- **HOTFIX A — Folder picker iteration robustness** — replaced unsafe `AsyncIterable<FileSystemHandle>` cast in `folder-reader.ts` with the standard `handle.entries()` API (`for await (const [name, entry] of handle.entries())`). Added early `isExcludedDir` filtering during traversal so excluded directories are never entered. Added `normalizeRelativePath()` helper in `file-filter.ts` with 5 unit tests.
- **HOTFIX B — Unused-imports proposedPatch fix** — rewrote patch generation in `unused-imports.ts` to correctly handle default imports, namespace imports, named imports, and combinations. Default+named preserves `import Default, { named } from '...'`. Namespace-only preserves `import * as NS from '...'`. Complex combinations (default+namespace, namespace+named) fall back to text-only suggestion with no code patch. Added 4 new test cases: default+named with unused named, unused namespace, all named unused, unused default only.
- **HOTFIX C — README alignment** — removed "drag-and-drop" claim from features. Added "Implemented Rules" table. Added "Planned Rules" table. Updated Demo steps to match actual UI buttons (Select Folder / Upload Folder / Analyze / Export .md).
- **HOTFIX D — Build script polish** — replaced `npm -ws` with `npm --ws` in root build script.
- **HOTFIX E — Docs updates** — this entry + code-walkthrough updates for folder traversal and unused-imports changes.

### Why

These hotfixes harden the codebase before adding new features (M4). The folder traversal was fragile across browsers, the unused-imports rule generated invalid patches for non-named imports, the README overstated features, and the build script used a deprecated short flag.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass (including new unused-imports & normalizeRelativePath tests)
```

### Design decisions

- **`handle.entries()` over `handle.values()`** — entries provides both name and handle, avoiding extra `getDirectoryHandle`/`getFileHandle` calls.
- **Early exclusion during traversal** — calling `isExcludedDir(name)` before recursing avoids reading entire `node_modules` trees.
- **Omitting proposedPatch for complex imports** — safer than generating incorrect patches; the text suggestion still explains what to do.

---

## 2026-03-05 — M3: Core Analysis Pipeline + Report UI

### What was implemented

- **Architecture doc** (`docs/architecture-and-rules.md`) — core architecture review with key decisions (VirtualFile input, in-memory ts-morph, deterministic ordering, centralized excludes, scoring formula) plus full specs for 5 rules.
- **Shared types overhaul** — `Issue` now includes `id`, `range: { start, end }`, `suggestion: { summary, details, proposedPatch?, proposedDiff? }`. New `VirtualFile`, `AnalysisSummary`, `AnalysisMeta` types. `AnalysisReport` restructured to `{ summary, issues, meta }`. Severity changed from `'warning'` to `'warn'`.
- **Core analysis pipeline** — `analyzeCodebase({ files, selectedDirectories, options? })` in `analyzer.ts`: filters files by selected dirs + excludes + `.ts/.tsx`, creates in-memory ts-morph `Project`, runs all rules, sorts issues deterministically (severity → ruleId → filePath → line → column).
- **Rule system** — new `Rule` interface: `{ id, title, severity, run(ctx: RuleContext) }` where `RuleContext` provides `sourceFile` + `filePath`. Registry in `rules/index.ts` exports `allRules[]`.
- **unused-imports rule** — detects unused default, namespace, and named import specifiers via `findReferencesAsNodes()`. Proposes removal of individual specifiers or entire import. Skips side-effect imports.
- **complexity-hotspot rule** — counts control-flow nodes (if/else, switch cases, ternaries, logical ops, loops, try/catch) with nesting depth bonus. Flags functions scored ≥ 12.
- **Stub rules** — `optional-chaining`, `boolean-simplification`, `early-return` return empty arrays; specs in architecture doc.
- **Scoring** (`scoring.ts`) — base 100, −10/error, −5/warn, −2/info, floor 0.
- **Markdown report** (`report.ts`) — header + summary table + issues table + per-file detail sections with proposed patches.
- **Web: file content reading** — `folder-reader.ts` now reads actual file content (FS Access API reads `.ts/.tsx` content inline; upload fallback reads via `File.text()`).
- **Web: real analysis call** — `useAppState.ts` calls `analyzeCodebase()` instead of stub. Supports `selectIssue()` and `exportMarkdown()`.
- **UI: issue list** — `MainPanel` shows severity filters (All/Error/Warning/Info) + search + clickable issue rows.
- **UI: details panel** — `DetailsPanel` shows selected issue's severity, rule, location, message, suggestion, and proposed patch with copy button.
- **UI: top bar** — shows score badge, issue/file counts, export button when report is available.
- **Tests** — 31 tests total (15 analyzer + 16 file-filter). New tests cover: unused-imports detection (full, partial, used, side-effect), complexity threshold behavior, markdown report sections.
- **README** — updated features, structure, and roadmap to reflect M3 reality.

### Why

M3 goal: deliver a working end-to-end analysis pipeline. Users can now select a folder, run analysis, see real issues, view suggestions, and export reports — all deterministically.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # 31 tests pass
npm run dev         # open browser, select a TS project, click Analyze
```

### Design decisions

- **In-memory ts-morph** — `useInMemoryFileSystem: true` avoids filesystem access in the analysis engine. Works in browser but ts-morph is heavy (~6MB bundle). Future: code-split or move analysis to a worker.
- **Severity `'warn'` not `'warning'`** — shorter, consistent with common tooling (ESLint, etc.), and aligns with the architecture spec.
- **`findReferencesAsNodes()` for unused imports** — more reliable than text search; handles re-exports, aliases, and namespace imports correctly.
- **Simple linear scoring** — easy to test, reason about, and explain to users. Can be refined later.
- **PR automation** — `gh pr create` + `gh pr merge` + `git reset --hard origin/main` per prompt-master workflow.

---

## 2026-03-05 — Bootstrap Monorepo

### What was implemented

- Initialized git repo with `main` and `dev` branches
- Created AI control files (`ai/prompt-master.md`, `ai/project-context.md`)
- Set up npm workspaces monorepo with three packages:
  - `apps/web` — Vite + React + TypeScript frontend
  - `packages/core` — Analysis engine with scanner, analyzer, rule interface
  - `packages/shared` — Shared types (Issue, AnalysisResult, AnalysisReport)
- Configured tooling: ESLint (flat config), Prettier, Vitest, TypeScript project references
- Built a minimal VSCode-like dark UI layout (TopBar, Sidebar, MainPanel, DetailsPanel)
- Wrote initial tests for scanner and analyzer (7 tests, all passing)

### Why

Foundation for the entire InspectoRepo project. The monorepo structure keeps analysis logic separate from the UI, making it testable and reusable (e.g., future CLI package).

### How to run/test

```bash
npm install
npm run dev        # Start web app
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # Build all packages
npm test           # Run Vitest
```

### Design decisions

- **npm workspaces** over Turborepo/Nx — minimal complexity for a small project
- **TypeScript project references** (`tsc -b`) — proper incremental builds across packages
- **Flat ESLint config** — modern approach, no `.eslintrc` files
- **VSCode-like dark theme** — professional look matching the target audience (developers/recruiters)
- **Placeholder rule** — returns zero issues; demonstrates the Rule interface contract without implementing logic yet

---

## 2026-03-05 — Project Infrastructure Improvements

### What was implemented

- **PR Automation** — Added a "Pull Request Automation" section to `ai/prompt-master.md` that documents the standard workflow for creating and merging PRs via GitHub CLI (`gh pr create`, `gh pr merge`) with safe fallbacks for missing CLI, auth issues, and branch protection.
- **MIT License** — Added `LICENSE` file (MIT, copyright 2026 Luis Castro).
- **README improvements** — Added a "Demo" section with three-step quickstart, and an "Interface Preview" section with a screenshot placeholder.
- **Screenshots directory** — Created `screenshots/` with a `README.md` placeholder explaining screenshots will be added as features are implemented.
- **CI workflow** — Added `.github/workflows/ci.yml` that runs on push/PR: checkout, setup Node 20, install, lint, typecheck, build, test.
- **Documentation updates** — Updated `docs/agent-worklog.md` and `docs/code-walkthrough.md` to cover all new files.

### Why

Project infrastructure to support professional development workflows: automated CI ensures checks pass on every push/PR, the license clarifies usage rights, the README improvements make the repo approachable for recruiters and contributors, and PR automation streamlines the agent development loop.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass
```

CI will also run automatically on push and PRs via GitHub Actions.

### Design decisions

- **GitHub Actions** over other CI — native to GitHub, zero config beyond the YAML file
- **`npm ci`** in CI — deterministic installs from lockfile
- **Node 20** — matches the project's `engines` requirement
- **`--delete-branch=false`** in PR merge — keeps `dev` alive for ongoing work

---

## 2026-03-05 — M1: Stable Scripts & Formatting

### What was implemented
- Added Prettier format scripts (`npm run format`, `npm run format:check`)
- Added `.editorconfig` for consistent editor settings
- Added `.prettierignore` to skip generated files
- Ran Prettier across all files for consistent formatting
- Updated README with new scripts

### Why
M1 goal: stable, reproducible scripts with consistent formatting. All four checks (lint, typecheck, build, test) pass cleanly.

### How to verify
```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages + web build successfully
npm test            # 7 tests pass
npm run format:check # all files formatted
```

---

## 2026-03-05 — Fix Build Script, CI, & Repo Polish

### What was implemented

- **Root build script fix** — replaced `npm run build --workspaces --if-present` (recursive invocation) with `npm -ws run build --if-present` which correctly delegates to each workspace.
- **CI workflow update** — switched `npm ci` to `npm install` (no lockfile in repo yet) and broadened `pull_request` trigger to all branches.
- **README corrections** — fixed clone URL to `wai-coding/inspectorepo`. Adjusted feature list to reflect current implementation status: UI skeleton is ready, folder selection and rule implementations are coming next.
- **PR automation improvement** — replaced `git pull origin main` sync step with `git fetch origin && git reset --hard origin/main && git push --force-with-lease origin dev`. This avoids unexpected merge commits and keeps `dev` an exact copy of `main` after merge.

### Why

- The recursive build script caused `npm run build` at root to fail or loop.
- Honest README feature descriptions prevent confusion for recruiters and contributors.
- The safer `reset --hard` + `force-with-lease` pattern prevents drift between `dev` and `main`.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # builds shared → core → web successfully
npm test            # all tests pass
```

### PR Status

`gh` CLI is installed but not authenticated. To create and merge the PR manually:

1. Authenticate: `gh auth login`
2. Create PR: `gh pr create --base main --head dev --title "fix: correct build script, add CI, and polish repo automation" --body "Fix build script, CI, README, PR automation, and docs"`
3. Merge PR: `gh pr merge --merge --delete-branch=false`

Or create the PR via the GitHub web UI at: https://github.com/wai-coding/inspectorepo/compare/main...dev

---

## 2026-03-05 — M2: Folder Input + Directory Tree

### What was implemented

- **`packages/core/src/file-filter.ts`** — reusable exclude rules (`isExcludedDir`, `filterExcludedPaths`), directory tree builder (`buildDirectoryTree`), default dir picker (`pickDefaultDirs`), and dir-based file filter (`filterBySelectedDirs`). Excludes `node_modules`, `dist`, `build`, `.git`, `.next`, `out`, `coverage`, `.turbo`, `.cache`, and all hidden directories.
- **`packages/core/src/file-filter.test.ts`** — 16 unit tests covering exclude rules, path filtering, tree building, default dir selection, and dir-based filtering.
- **`apps/web/src/folder-reader.ts`** — folder selection via File System Access API (`selectFolderViaAPI`) and fallback upload via `<input webkitdirectory>` (`readUploadedFiles`). Processes files through core exclude + TS/TSX filters.
- **`apps/web/src/useAppState.ts`** — central app state hook managing folder name, file list, directory tree, selected dirs, and analysis report. Supports localStorage persistence for dir selections.
- **Updated UI components:**
  - `TopBar` — "Select Folder", "Upload Folder", "Analyze" buttons + folder/dir status display
  - `Sidebar` — directory list with checkboxes and file counts
  - `MainPanel` — empty state ("No issues yet — run analysis") when report has zero issues
- **`eslint.config.mjs`** — added browser globals (`FileList`, `File`, `FileSystemDirectoryHandle`, `HTMLInputElement`, `localStorage`)
- **Stubbed analysis** — the Analyze button produces an `AnalysisReport` with zero issues (rule engine is M3)

### Why

M2 delivers the first user-facing interaction: selecting a folder, seeing its directory structure, choosing which directories to scan. This is the prerequisite for rule-based analysis in M3.

### Design decisions

- **Core `file-filter` module** — kept in `packages/core` so the same exclude/filter logic can be reused by a future CLI package
- **`VirtualFile` abstraction** — the web app converts both FS Access API handles and uploaded FileList entries into a flat `{ path, content }` array, decoupling the UI from the browser API
- **Async iterator workaround** — `FileSystemDirectoryHandle.values()` lacks TS types; used manual `Symbol.asyncIterator` cast to avoid adding custom type declarations
- **localStorage dirs** — best-effort persistence: saved per folder name, silently ignored on error

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # builds shared → core → web
npm test            # 23 tests pass (7 analyzer + 16 file-filter)
npm run dev         # open browser, select folder, see directory tree
```
