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

### `scripts/generate-repomix-exports.ts`

Node script (run via `npm run repopack`) that:
1. Scans `ai/exports/` for existing versioned filenames (e.g. `repo-pack-full-v10.md`)
2. Finds the highest version number N present
3. Computes `nextVersion = N + 1` (starts at v1 if no files exist)
4. Runs `npx repomix` twice — once for a full pack, once for a core-only pack (excludes docs/screenshots/.github)
5. Extracts latest merged PR metadata via `gh` (number, title, body, merge commit SHA)
6. Determines milestone-scoped files changed using the merge commit range (falls back to `gh pr diff`, then latest merge on main)
7. Auto-generates polished, recruiter-friendly Human Summary bullets (3–5) — strips commit noise, validates against banned patterns, retries with area-based fallback if needed
8. Writes three files under `ai/exports/`:
   - `repo-pack-full-vN.md` — full repository pack
   - `repo-pack-core-vN.md` — core-only pack
   - `changes-summary-vN.md` — milestone summary with PR links, polished summary, and scoped file list
9. Validates summary content: 3–5 bullets, no banned noise, no duplicates, no empty bullets, non-empty Files Changed
10. Verifies all 3 files exist; exits with code 1 if any are missing
11. Verifies the new version is strictly greater than the previous highest version
12. Deletes all older export versions — only the latest set remains
13. **Post-cleanup verification** — scans exports dir again and fails with `process.exit(1)` if any stale versioned files remain or the file count is unexpected

Key functions:
- `getLatestPRInfo()` — queries `gh` for the latest merged PR's number, title, body, and merge commit SHA
- `getMilestoneFilesChanged(pr)` — uses merge commit parent range, falls back to `gh pr diff`, then latest merge commit on main
- `categorizeFiles(files)` — groups changed files by area (core, cli, web, docs, ai, workflow, etc.)
- `cleanBulletText(raw)` — strips conventional-commit prefixes (`fix:`, `feat:`, etc.), merge request lines, list markers, and inline backtick-wrapped code from raw text. Also removes stray/unmatched backticks
- `isBannedBullet(bullet)` — checks a bullet against the `BANNED_BULLET_PATTERNS` regex array (merge noise, commit prefixes, internal meta text)
- `isTruncatedBullet(text)` — detects bullets that were truncated during extraction: unmatched backticks (odd count), unmatched code blocks, trailing backslash, or very short text (<15 chars)
- `buildAreaBullets(files)` — generates polished, outcome-focused bullets from changed file areas using `AREA_BULLET_TEMPLATES` (e.g. "Improved the core analysis engine for better detection accuracy")
- `validateBullets(bullets)` — enforces 3–5 count, no banned patterns, no duplicates, no empty bullets, no truncated bullets; returns list of failures
- `generateHumanSummary(pr, files, commits)` — produces 3–5 polished, milestone-specific bullets: (1) cleans PR title/body, (2) fills from area templates, (3) validates and retries with pure area fallback if needed. Filters out truncated bullets during extraction
- `validateSummaryContent(content)` — validates the written summary file: placeholder phrases, bullet count 3–5, banned noise in each bullet, truncated bullets, duplicates, empty bullets, non-empty Files Changed, and Next Milestone validity (no already-implemented items, 2–4 count)
- `generateNextMilestoneSection()` — dynamically generates the "Next Milestone" section from a curated `ROADMAP` array, filtering out items marked as `implemented`. Returns 2–4 future milestones as bullet lines

#### Human Summary Quality Rules

The script enforces strict quality rules on every Human Summary bullet:

**Banned patterns** (any match causes rejection):
- `Merge pull request`, `Merge branch`
- Conventional commit prefixes: `fix:`, `feat:`, `chore:`, `refactor:`, `docs:`, `ci:`, `style:`, `perf:`, `test:`, `build:`
- Internal/meta text: `filter banned words`, `summary extraction`, `PR body`, `cleanup regex`, `merge noise`, `regex cleanup`, `PR body line filtering`, `WIP`, `bump`, `update dependencies`

**Structural rules**:
- Exactly 3–5 bullets (no fewer, no more)
- No duplicate bullets (case-insensitive)
- No empty bullets

**Fallback strategy**: If PR metadata produces noisy or insufficient bullets, the script generates bullets from changed file area groups using polished templates. If even the fallback fails validation, the script aborts with `process.exit(1)`.

#### Next Milestone Generation

The `ROADMAP` array contains all milestones with an `implemented` boolean flag. `generateNextMilestoneSection()` filters to unimplemented items only and returns 2–4 bullet lines. `validateSummaryContent()` cross-checks the generated Next Milestone section against the roadmap to ensure no already-shipped features are listed.

No tracked state file is used. The version is derived entirely from existing export filenames.

### `exports/`

Git-ignored directory containing generated repomix exports (`repo-pack-full-vN.md`, `repo-pack-core-vN.md`, `changes-summary-vN.md`). These are uploaded to ChatGPT for review after each milestone merge.

---

## `scripts/`

### `extract-report-summary.ts`

CLI utility that reads a markdown report file and parses its summary table using `parseReportSummary()` from `@inspectorepo/core`. Outputs a JSON object `{ score, totalIssues, errors, warnings, info }` on success, or the string `"null"` if parsing fails. Used by the GitHub Actions workflow (`inspectorepo-analysis.yml`) to extract report metrics without duplicating regex logic inline. Accepts an optional file path argument (defaults to `inspectorepo-report.md`).

---

## `examples/`

### `fixture-repo/`

Sample TypeScript files designed to trigger all 4 implemented rules when analyzed:
- `src/api-client.ts` — unused imports (Logger, formatPercentage, config namespace)
- `src/data-processor.ts` — complexity hotspot (deeply nested control flow, score 72) + unused EventEmitter
- `src/user-utils.ts` — optional chaining (3 guard chains) + boolean simplification (5 patterns)
- `src/formatters.ts` — clean utility file (import target, no issues)

### `custom-rule-no-console.ts`

Example custom rule using `defineRule()` from `@inspectorepo/core`. Detects `console.log/warn/error` calls via ts-morph AST traversal. Demonstrates the custom rule API pattern for user-defined rules.

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

### `src/report-parser.ts`

`parseReportSummary(markdown)` — parses the markdown summary table produced by `buildMarkdownReport()` and returns a `ReportSummary` object with `score`, `totalIssues`, `errors`, `warnings`, and `info` counts. Iterates over table rows `| key | value |`, strips emoji prefixes, and extracts numeric values. Returns `null` if the table is missing or any required field cannot be parsed — callers should use a safe fallback message.

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

Detects unnecessary block-style early returns. Looks for `IfStatement` nodes where:
- There is no `else` branch
- The consequent is a `Block` with exactly one statement
- That statement is a `ReturnStatement` with no argument
- No comments exist inside the block

Suggests collapsing `if (cond) { return; }` into `if (cond) return;`. Produces a `proposedDiff` showing the simplified form.

### `src/custom-rule.ts`

`defineRule(definition)` — factory function for creating custom rules compatible with the analysis engine. Accepts a `CustomRuleDefinition` object (id, title, severity, run function) and returns a `Rule`. Custom rules can be passed into `analyzeCodebase()` via `options.customRules` and run alongside built-in rules.

### `src/presets.ts`

Rule preset system:
- `resolvePreset(name)` — returns a `RuleConfig` for the given preset name, or null for unknown presets
- `isValidPreset(name)` — type guard checking if a string is a valid `PresetName`
- `getPresetNames()` — returns the list of available preset names

Presets: `recommended` (all warn), `strict` (unused-imports + complexity at error), `cleanup` (complexity off, style rules on), `react` (unused-imports at error for TS+React projects).

### `src/config.ts`

Rule configuration loader:
- `parseConfig(json)` — parses `.inspectorepo.json` content, returns `InspectorepoConfig` or null. Now also reads the optional `preset` field.
- `mergeConfig(loaded, preset?)` — merges loaded config with defaults. If a preset is provided, its values serve as the base before applying explicit rule overrides.
- `filterRulesByConfig(rules, config)` — filters and optionally overrides severity based on config
- `cliRulesToConfig(cliRules, allRuleIds)` — converts `--rules` CLI flag value into a config object

### `src/ignore.ts`

Ignore file loader with simple gitignore-like matching:
- `parseIgnoreFile(content)` — strips comments/blanks, returns pattern array
- `isIgnored(filePath, patterns)` — matches path segments or `*.ext` wildcards
- `filterIgnoredPaths(filePaths, patterns)` — removes matching paths

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
- `parseArgs(args)` — parses `analyze <path>` and `fix <path>` plus `--dirs`, `--format`, `--out`, `--max-issues`, `--preview`, `--help` options. Returns `CliOptions` or `null` on error.
- `run(args)` — resolves the target path, reads files via `readFilesFromDisk()`, filters by selected dirs, calls `analyzeCodebase()`, formats output as markdown or JSON, writes to file or stdout.
- `runFix(args)` — runs analysis then filters to auto-fixable issues. In `--preview` mode, calls `formatPreviewReport()` and exits without modifying files. Otherwise, prompts interactively for each fix using `applyFix()`.

### `src/fs-reader.ts`

Node filesystem utilities:
- `readFilesFromDisk(rootDir)` — recursively walks directories using `readdirSync`, skips excluded dirs via `isExcludedDir()`, collects `.ts/.tsx` files as `VirtualFile[]` with content. Results sorted by path for determinism.
- `parseDirs(input)` — splits comma-separated directory string into array, trims whitespace.
- `filterByDirs(files, dirs)` — filters `VirtualFile[]` to only files under specified directories. Returns all files when dirs is empty.

### `src/cli.test.ts`

9 tests: `parseDirs` (comma split, whitespace trim, empty input, single dir) and `filterByDirs` (empty dirs, single dir filter, multiple dirs, no match, partial prefix rejection).

---

## `packages/vscode-extension`

VS Code extension that runs InspectoRepo analysis directly inside the editor.

### `src/extension.ts`

Extension entry point:
- `activate(context)` — registers the `inspectorepo.runAnalysis` command. When triggered: checks for an open workspace folder (shows warning if none), resolves the CLI path relative to the extension, runs the CLI via `child_process.execFile` with `--format md --out inspectorepo-vscode-report.md`, and shows a progress notification during analysis. Displays an info message on success or error message on failure.
- `deactivate()` — no-op cleanup.

The extension activates only when the command is invoked (no heavy activation events). It delegates all analysis work to the existing CLI package.

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

Header bar with score badge, issue/file counts, folder actions, Analyze button, and Export .md button. Includes a **Preview** status badge next to the app name (amber-styled, with tooltip "Under active development") to signal pre-release status.

### `src/components/Sidebar.tsx`

Left panel with directory tree checkboxes.

### `src/components/MainPanel.tsx`

Center panel. Shows:
- Placeholder before analysis
- "No issues found" + score when clean
- Severity filter buttons (All/Errors/Warnings/Info) + search input
- Expandable issue rows with severity-colored left borders (red for error, amber for warn, blue for info)

Each row displays severity label, rule id, file path with highlighted line number, message text, and a chevron indicator. Clicking a row toggles inline expansion showing severity (color-coded text), rule, location (`file:line:col`), full message, and suggestion. The chevron rotates 90° when expanded via CSS transition. Row click also sets the selected issue for the DetailsPanel.

### `src/components/DetailsPanel.tsx`

Right panel showing selected issue details. Uses a tabbed layout with **Suggestion** and **Diff** tabs (via `useState<DetailTab>`). The Suggestion tab shows the summary, details, and a **Copy Suggested Fix** button. The Diff tab shows the proposed fix in a `<pre>` block with a **Copy Diff** button. Prefers `proposedDiff` over `proposedPatch`. The Diff tab only appears when a diff is available.

### `src/styles/global.css`

Dark theme with CSS custom properties. Styles for: layout, top bar (summary badge), issue toolbar (filter buttons, search), issue list rows with severity-colored left borders (`.severity-row-error/warn/info`), expandable issue details (`.issue-expanded` grid layout with label/value pairs), chevron rotation transition (`.issue-chevron`), severity text colors (`.severity-text-error/warn/info`), detail panel tabs (`.detail-tabs`, `.detail-tab`, `.detail-tab.active` with accent underline), detail panel sections, proposed patch code block, `.detail-actions` for copy buttons.

---

## `.github/workflows/`

### `ci.yml`

Standard CI pipeline: runs lint, typecheck, build, and test on push to `main`/`dev` and on pull requests.

### `inspectorepo-analysis.yml`

GitHub Action that runs InspectoRepo analysis on pull requests (and manual `workflow_dispatch`). Steps:
1. Checkout + Node 20 setup
2. Install dependencies and build all packages
3. Run `node packages/cli/dist/index.js analyze . --dirs packages,apps --format md --out inspectorepo-report.md`
4. Upload the generated report as an artifact (`inspectorepo-report`)
5. **Extract report summary** — runs `scripts/extract-report-summary.ts` (which calls `parseReportSummary()` from `@inspectorepo/core`) to parse the markdown into a JSON object `{ score, totalIssues, errors, warnings, info }`. This reuses the same tested parser rather than duplicating regex logic inline.
6. **PR comment bot** — on pull request events, uses `actions/github-script@v7` to post or update a summary comment on the PR using the parsed JSON. If parsing returned `null`, posts a safe fallback message. Uses an HTML marker comment (`<!-- inspectorepo-analysis -->`) to find and update a previous bot comment, avoiding duplicates.

The report artifact can be downloaded from the Actions tab for each PR. The summary comment provides instant visibility without downloading.

---

## Repomix Workflow

### How milestone versioning works

The version is derived from filenames already present in `ai/exports/`. Each `npm run repopack` run scans for the highest existing version number and increments by one. No tracked state file is used — this avoids version resets when git clean or git reset happens. The generated exports live in `ai/exports/` which is git-ignored — they are never committed. After generation, the script:

1. Validates the new version is strictly greater than the previous one
2. Deletes all older export versions
3. Verifies no stale versioned files remain (fails with `process.exit(1)` if cleanup was incomplete)
4. Confirms exactly 3 export files exist for the new version

### Post-merge workflow

After each milestone merge, the post-merge workflow is:

1. Merge PR into `main`
2. Sync `dev` with `main` (hard reset + force-with-lease push)
3. Determine previous highest export version in `ai/exports/`
4. Run `npm run repopack`
5. Confirm new version is strictly greater than previous
6. Confirm only latest export files remain
7. Print previous version, new version, and exact filenames
8. Stop — exports are git-ignored, not committed. Upload to ChatGPT for review.

### Full vs Core repo pack

The repomix script generates two pack files:

- **`repo-pack-full-vN.md`** — excludes only noise: `node_modules`, `dist`, `build`, `.git`, `.next`, `coverage`, `.turbo`, `.cache`, `ai/exports`, `examples`, `screenshots/*.webm`
- **`repo-pack-core-vN.md`** — also excludes `screenshots`, `docs`, `.github` for a smaller context window focused on source code

### Summary structure

`changes-summary-vN.md` includes:
- **PR** — auto-detected link and compare URL from the latest merged PR (via `gh`)
- **Human Summary** — 3–6 auto-generated bullet points derived from PR title/body, changed file areas, and commit subjects (never placeholder text)
- **Changes** — last 10 commits (oneline format)
- **Files Changed** — scoped to the latest merged PR only (uses merge commit range, `gh pr diff`, or latest merge on main as fallback)
- **Known Limitations** — current tool limitations
- **Next Milestone** — planned features
- **Regenerate** — instructions to regenerate

### Why repomix exports are ignored

The repo pack files are large (thousands of lines) and change every run. Committing them would bloat the repository. Instead, they are generated on-demand and uploaded to external AI tools for review.

---

## Auto-Fix CLI

### `packages/cli/src/fixer.ts`

The fixer module provides safe auto-fix capabilities with occurrence-counted, line-validated replacement:
- `isAutoFixable(issue)` — checks if an issue's rule is in the safe allowlist (`optional-chaining`, `boolean-simplification`, `unused-imports`) and has a `proposedDiff`
- `parseDiff(diff)` — parses `- old\n+ new` format into `{ oldText, newText }`, where `newText` is null for removal-only diffs
- `applyFix(rootDir, issue)` — reads the file and applies a controlled replacement: (1) counts non-overlapping occurrences of the old text — skips if zero or more than one, (2) validates that the content at the issue's reported line number matches the expected pattern, (3) uses `indexOf` on the confirmed single occurrence to perform the replacement. Warns and skips on duplicate patterns or unexpected context
- `countOccurrences(text, search)` — counts non-overlapping substring matches, used as a safety guard
- `formatFixPreview(issue)` — formats a human-readable preview for terminal display showing rule id, file, line, before/after code, and suggested diff

The fix engine ensures only one occurrence of the target text exists in the file, validates the intended line matches expectations, then performs a controlled `indexOf` replacement on the confirmed single match. This three-step approach (occurrence counting → line validation → indexOf replacement) prevents accidental edits when a pattern appears multiple times or the file has changed since analysis.

- `formatPreviewReport(issues)` — generates a read-only preview report for all fixable issues. Shows `Proposed fixes:` header, then for each issue: file path, rule id, Before/After code blocks (indented), separated by `---`. Ends with `"{N} fixable issue(s) found. No files were modified."`. Used by the `--preview` CLI flag.

### `packages/cli/src/fixer.test.ts`

16 tests covering `isAutoFixable`, `parseDiff`, `applyFix`, and `formatPreviewReport`:
- Auto-fixable: optional-chaining, boolean-simplification, unused-imports (all true with diff)
- Not auto-fixable: complexity-hotspot (always false), missing diff (false)
- Parse: optional chaining diff, boolean diff, removal-only diff, partial import fix, empty/invalid diff
- Apply safety: duplicate pattern skipped, single occurrence applied, unexpected context skipped, normal optional chaining fix
- Preview: `formatPreviewReport` renders expected output with Before/After text; preview mode produces correct issue count and "No files were modified" message

---

## Roadmap Structure

The README roadmap is organized into versioned milestones:

- **V1 — Foundation** — core engine, rules, UI, scoring, config, ignore system
- **V2 — Automation** — CLI, auto-fix, GitHub Action, PR comment bot, HTML export
- **V3 — Platform (current)** — custom rule API, presets, preview fixes, monorepo grouping, VS Code extension, summary-only CLI, improved PR comments, web onboarding UX
- **V4 — Planned** — hosted web app, inline VS Code suggestions, dependency graph, performance profiling

`CHANGELOG.md` at the project root mirrors this structure with concise feature lists per version.

### Export Modes

Three export types are generated by `npm run repopack`:

- **`repo-pack-full-vN.md`** — complete repository pack (excludes noise)
- **`repo-pack-core-vN.md`** — core source only (also excludes docs, screenshots, .github)
- **`repo-pack-latest-vN.md`** — lightweight pack with project structure, core files, and latest milestone summary (excludes historical logs, screenshots, docs)
