# Agent Worklog

Development log for InspectoRepo. Each entry describes what was implemented, why, and how to verify.

---

## 2026-03-10 — Fix: milestone-specific repopack summaries

### What was implemented

- **Removed placeholder text** — the `Human Summary` section in `changes-summary-vN.md` no longer contains `(Fill in after merge — describe what changed in this milestone)`. It is now auto-generated from real repository data.
- **Auto-generated Human Summary** — the script builds 3–6 factual bullet points using: (1) PR title from the latest merged PR, (2) key lines from PR body, (3) area-based bullets from categorized changed files (e.g. "Updated core analysis engine (3 files)"), (4) recent commit subjects as fallback. Bullets are deduplicated and capped at 6.
- **Milestone-scoped Files Changed** — replaced `git diff HEAD~10 --name-only` (which mixed unrelated older files) with a strategy that targets only the latest merged PR/milestone: first tries `git diff mergeCommit^1..mergeCommit^2`, then `gh pr diff N --name-only`, then the latest merge commit range on main. Files are sorted deterministically.
- **PR metadata extraction** — enhanced `getLatestPRInfo()` to fetch PR number, title, body, and merge commit SHA via `gh pr list --json`. The compare link now points to the PR's files tab.
- **Summary content validation** — added `validateSummaryContent()` that fails with `process.exit(1)` if: placeholder phrases are detected, Human Summary has fewer than 3 bullets, or Files Changed is empty.
- **Prompt-master update** — added "Changes Summary Requirements" subsection, fixed duplicate Completion Rule entries, added summary validation to completion checklist.
- **Code-walkthrough update** — rewrote the `generate-repomix-exports.ts` section to document all new functions (`getLatestPRInfo`, `getMilestoneFilesChanged`, `categorizeFiles`, `generateHumanSummary`, `validateSummaryContent`) and the updated summary structure.

### Why

The previous script generated a placeholder Human Summary that required manual editing, and used `HEAD~10` for Files Changed which polluted the summary with unrelated older files. Both problems made the changes-summary unreliable for external review.

### How to verify

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run repopack   # generates next version with auto-generated summary
```

After running repopack, open `ai/exports/changes-summary-vN.md` and confirm:
- Human Summary has real bullets (no placeholder text)
- Files Changed lists only files from the latest merged PR

### Design decisions

- **Multi-strategy file detection** — tries merge commit range first (most precise), then `gh pr diff` (works even when local history is shallow), then latest merge on main. Accepts the first non-empty result.
- **Area categorization** — groups files by directory prefix (core, cli, web, docs, etc.) to generate meaningful area-based bullets.
- **Validation before cleanup** — the summary is validated before old versions are deleted, preventing data loss if generation produces bad output.

---

## 2026-03-10 — M12 finalization: workflow validation, prompt-master cleanup, docs alignment

### What was implemented

- **Verified `inspectorepo-analysis.yml`** — confirmed the GitHub Action workflow file exists and meets all requirements: triggers on `pull_request` and `workflow_dispatch`, uses `ubuntu-latest`, Node 20 with npm cache, builds all packages, runs `node packages/cli/dist/index.js analyze . --dirs packages,apps --format md --out inspectorepo-report.md`, and uploads the report as an artifact retained for 30 days.
- **Prompt-master cleanup** (`ai/prompt-master.md`) — removed redundant post-merge steps (steps 4–8 had duplicate "print results" and "STOP" instructions). Consolidated the "Final Mandatory Checklist" and "Non-negotiable completion rule" sections into a single "Completion Rule" section. The post-merge workflow now has 8 clear non-redundant steps: merge → sync → determine version → repopack → validate version → validate files → print → stop.
- **README alignment** — updated CI pipeline Key Feature to mention both workflows (lint/typecheck/build/test CI plus automated InspectoRepo analysis on PRs). Verified all other claims match reality.
- **Code walkthrough update** — added explicit "Post-merge workflow" subsection under the Repomix Workflow section documenting the 8-step post-merge process.

### Why

The prompt-master had duplicate instructions that could confuse an AI agent (two separate "STOP" directives, two separate "print results" steps, three overlapping completion checks). Consolidating these into a single clear workflow prevents ambiguity. The README and docs needed to accurately reflect the current state of both CI workflows.

### How to verify

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

### Design decisions

- **Single completion rule** — merged the checklist and non-negotiable rule into one section to eliminate redundancy while preserving strictness.
- **8-step post-merge flow** — matches the exact sequence an agent should follow, with no repeated or contradictory instructions.

---

## 2026-03-10 — Final review fixes, repopack hardening, Quickdraw attempt

### What was implemented

- **GitHub Action alignment** — updated README to show the exact CLI command used in `.github/workflows/inspectorepo-analysis.yml`, including the `node packages/cli/dist/index.js analyze .` invocation, artifact retention (30 days), and manual `workflow_dispatch` trigger.
- **Repopack post-cleanup verification** — `generate-repomix-exports.ts` now verifies after deleting old versions that no stale versioned files remain in `ai/exports/`. Fails with `process.exit(1)` if any old files survived cleanup or the file count is wrong. Also confirms exactly 3 export files exist for the new version.
- **Prompt-master validation** — updated the Post-Merge Repomix Export section in `prompt-master.md` with explicit step-by-step validation: determine previous version before running, confirm new version > previous, confirm only latest files remain, print results, then stop.
- **Code-walkthrough updates** — documented the post-cleanup verification step in both the `generate-repomix-exports.ts` section and the Repomix Workflow section.

### Why

These are the final polish items from the latest review. The repopack script needed stronger post-cleanup guarantees, the README needed exact alignment with the workflow file, and the prompt-master needed clearer validation steps to prevent incomplete runs.

### How to verify

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run repopack   # generates next version, verifies cleanup
```

### Quickdraw achievement attempt

- **Issue created:** #21 ("Quickdraw achievement test issue")
- **Issue closed:** immediately after creation
- **Result:** SUCCESS — issue was created and closed within seconds
- **Note:** The GitHub Quickdraw achievement may not appear instantaneously; GitHub processes achievements asynchronously.

---

## 2026-03-10 — M12: GitHub Action for Automated Analysis

### What was implemented

- **GitHub Action workflow** (`.github/workflows/inspectorepo-analysis.yml`) — runs InspectoRepo analysis automatically on every pull request. Also supports manual `workflow_dispatch`. Steps: checkout, Node 20 setup, install, build, run `inspectorepo analyze`, upload report as artifact.
- **README update** — added "GitHub Action" section explaining the automated analysis workflow. Updated V2 roadmap to mark GitHub Action as complete.
- **Docs update** — added `.github/workflows/` section to code-walkthrough documenting both `ci.yml` and the new `inspectorepo-analysis.yml`.

### Why

Running InspectoRepo analysis in CI provides automated code quality feedback on every PR without manual effort. The report artifact makes it easy to review analysis results directly from the Actions tab.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass
```

The workflow runs automatically on PRs. For manual testing, trigger via `workflow_dispatch` from the Actions tab.

### Design decisions

- **Artifact upload over PR comment** — uploading a report artifact is simpler and more reliable than parsing output for PR comments. A TODO is left for future PR comment enhancement.
- **`--dirs packages,apps`** — analyzes only source code directories, skipping examples/fixtures/screenshots.
- **Separate from CI** — the analysis workflow is its own file rather than a step in `ci.yml` to keep concerns separated.

---

## 2026-03-10 — Finalize repopack version validation and cleanup

### What was implemented

- **Version validation** — `generate-repomix-exports.ts` now verifies the new version is strictly greater than the previous highest version. Exits with code 1 if validation fails.
- **Old version cleanup** — after the new version is verified, the script deletes all older export files from `ai/exports/`. Only the latest version set remains.
- **Output format** — the script now prints both the previous version and the new version, plus the exact generated filenames and a confirmation that old versions were deleted.
- **Updated prompt-master.md** — post-merge workflow now explicitly requires version comparison, old version cleanup, and printing both previous and new versions.
- **Updated docs** — code-walkthrough and agent-worklog updated to document the new validation and cleanup behavior.

### Why

The repopack workflow needed stronger guarantees: confirming the new version is strictly greater prevents stale regeneration, and cleaning up old versions prevents confusion about which export set is current.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass
npm run repopack   # generates next version, deletes old versions
```

### Design decisions

- **Delete after verify** — old versions are only deleted after the new version's 3 files are confirmed to exist. This prevents data loss if generation fails.
- **Single version in exports** — keeping only the latest version avoids confusion and saves disk space.

---

## 2026-03-10 — Fix: Derive repomix version from local export files

### What was implemented

- **Removed `ai/repomix-state.json`** — deleted the tracked version counter file that caused version resets when git clean/reset happened.
- **Rewrote `ai/scripts/generate-repomix-exports.ts`** — the script now scans `ai/exports/` for existing versioned filenames (`repo-pack-full-vN.md`, `repo-pack-core-vN.md`, `changes-summary-vN.md`), finds the highest version number N, and generates the next version as N+1. Starts at v1 if no files exist. No tracked state file is used.
- **Updated `ai/prompt-master.md`** — replaced all references to `currentVersion` and `ai/repomix-state.json` with the new file-derived versioning workflow.
- **Updated `docs/code-walkthrough.md`** — documented the new versioning approach in the `ai/` and Repomix Workflow sections.
- **Updated `docs/agent-worklog.md`** — removed references to the version state file in the repomix workflow entry.

### Why

The previous design used `ai/repomix-state.json` as a tracked version counter while requiring exports to remain uncommitted. This created a conflict: the state file changed locally, got reset by git operations, and the same version number was generated again. Deriving the version from existing export filenames eliminates this design flaw entirely.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass
npm run repopack   # generates next-version exports under ai/exports/
```

### Design decisions

- **Filename scanning over state file** — the version is derived from files that already exist locally, making it immune to git clean/reset.
- **Exports remain git-ignored** — large generated files stay out of version control.
- **No external dependencies added** — uses only `readdirSync` and a regex to find existing versions.

---

## 2026-03-10 — M11: Hardened Fix Engine, Pipeline Integration, Workflow Fixes

### What was implemented

- **Hardened fix engine** (`packages/cli/src/fixer.ts`) — replaced fragile `indexOf`-based patching with line-based replacement. `applyFix()` now: counts occurrences (skips if >1), verifies content at the target line number matches the expected pattern, and warns on unexpected context. Prevents accidental edits when a pattern appears multiple times or the file has changed since analysis.
- **Fix pipeline integration** — `inspectorepo fix` now uses the same analyzer pipeline as `analyze`: loads `.inspectorepo.json` config, `.inspectorepoignore` patterns, respects `--dirs` and `--rules` flags.
- **Fix safety tests** (`packages/cli/src/fixer.test.ts`) — 4 new `applyFix` tests: duplicate pattern skip, single occurrence apply, unexpected context skip, normal optional chaining fix. Uses real temp files.
- **CLI fix preview format** — updated `formatFixPreview()` to use `Rule: <id>` header instead of `<id> suggestion`.
- **Repomix workflow fix** — standardized prompt-master.md to reference `repo-pack-full-vN.md` + `repo-pack-core-vN.md` + `changes-summary-vN.md`. Updated code-walkthrough to match. Removed stale "early-return is a stub" text from changes-summary template.
- **README fixes** — corrected ignore system description (no longer claims full gitignore compatibility), updated fix preview example.

### Why

The original fix engine used `indexOf` to find-and-replace, which is unsafe — it silently applies the wrong fix when a pattern appears multiple times. Line-based verification ensures the fix targets the correct location. Pipeline integration ensures `fix` and `analyze` behave identically.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass
```

### Design decisions

- **Line-based verification** — the fix engine now checks that the target line number contains the expected text before applying. This prevents ghost edits when files have been modified since analysis.
- **Occurrence counting** — if a pattern appears more than once, the fix is skipped entirely with a warning rather than guessing which one to replace.
- **Pipeline reuse** — fix command shares the same config/ignore loading logic as analyze, avoiding code duplication and behavioral drift.

---

## 2026-03-06 — M8/M9/M10: Early Return, Rule Config, Ignore System

### What was implemented

- **Removed placeholder rule** (`packages/core/src/rules/placeholder.ts`) — deleted unused stub rule file. No imports referenced it.
- **Improved CLI fix preview** (`packages/cli/src/fixer.ts`) — `formatFixPreview()` now shows file path, line number, before/after code blocks, and suggested diff in a clear format.
- **Early-return rule** (`packages/core/src/rules/early-return.ts`) — M8: detects unnecessary block-style early returns (`if (cond) { return; }`) and suggests single-line form (`if (cond) return;`). Safety: only triggers when block has exactly one `ReturnStatement` with no argument, no comments inside, and no else branch. 5 tests.
- **Rule configuration system** (`packages/core/src/config.ts`) — M9: supports `.inspectorepo.json` config file with `error`/`warn`/`off` severity levels per rule. CLI `--rules` flag overrides config file. Functions: `parseConfig()`, `mergeConfig()`, `filterRulesByConfig()`, `cliRulesToConfig()`. 7 tests.
- **Ignore system** (`packages/core/src/ignore.ts`) — M10: supports `.inspectorepoignore` file with gitignore-like pattern matching. Patterns match path segments or `*.ext` wildcards. Integrated into analyzer pipeline and CLI. 9 tests.
- **CLI `--rules` flag** — `inspectorepo analyze ./project --rules optional-chaining,unused-imports` runs only specified rules.
- **README** — added Rules, Configuration, Ignore File, CLI Fix sections. Updated roadmap and implemented rules table.
- **Docs** — updated architecture-and-rules.md, code-walkthrough.md with new features.

### Why

M8–M10 add essential developer experience features: the early-return rule completes the V1 rule set, the config system lets users customize analysis, and the ignore system prevents noise from irrelevant files.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass
```

### Design decisions

- **Simple ignore matching** — uses path segment matching rather than full glob support. Sufficient for common patterns (directory names, file extensions) without heavy dependencies.
- **Config merging** — rules not mentioned in config default to `warn`, so existing behavior is preserved.
- **CLI --rules overrides config** — explicit CLI flags always win, matching the principle of least surprise.
- **Early-return scope** — M8 implementation targets the simpler pattern (block-wrapped `return;`) rather than the full spec (function-level guard clauses). Conservative but safe.

---

## 2026-03-06 — Repomix Export Workflow (versioned, ignored)

### What was implemented

- **Repomix export script** (`ai/scripts/generate-repomix-exports.ts`) — Node script that scans `ai/exports/` for existing versioned filenames, determines the next version, runs `npx repomix` to generate two repo packs (full and core), gathers git history (last 10 commits, files changed), and writes three files under `ai/exports/`:
  - `repo-pack-full-vN.md` — full repository pack generated by repomix
  - `repo-pack-core-vN.md` — core-only pack (excludes docs/screenshots/.github)
  - `changes-summary-vN.md` — milestone header, latest merge info, commit log, changed files, regeneration instructions
- **Exports directory** (`ai/exports/`) — git-ignored directory for generated export files.
- **`.gitignore` updates** — added `ai/exports/` ignore rule and monorepo-wide build artifact ignores (`**/dist/`, `**/.vite/`, `**/coverage/`, `**/out/`, `**/.turbo/`).
- **npm script** — `npm run repopack` in root package.json runs `tsx ai/scripts/generate-repomix-exports.ts`.
- **Prompt master update** — added "Post-Merge Repomix Export" section documenting the workflow: run repopack, verify files, stop, instruct user to upload.
- **ESLint ignore** — added `ai/scripts/*.ts` to eslint config ignores (Node scripts, not browser code).

### Why

Creates a repeatable workflow for generating full codebase snapshots after each milestone merge. The exports can be uploaded to ChatGPT for comprehensive review without committing large generated files to git.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass
npm run repopack   # generates next-version exports under ai/exports/
```

### Design decisions

- **Exports git-ignored** — the repo pack files are large and change every run; they don’t belong in version control.
- **Version derived from filenames** — the script scans `ai/exports/` for existing versioned files and increments from the highest found. No tracked state file is needed, which avoids version resets when git clean/reset happens.
- **npx repomix** — avoids requiring a global install; works in CI or fresh clones.
- **Monorepo-wide ignores** — `**/dist/`, `**/coverage/`, etc. use glob patterns to catch nested workspace outputs.

---

## 2026-03-06 — M6: Headless CLI for InspectoRepo

### What was implemented

- **CLI package** (`packages/cli/`) — new workspace package (`@inspectorepo/cli`) providing the `inspectorepo` bin command for terminal-based codebase analysis.
- **Commands**: `inspectorepo analyze <path> [options]`
  - `--dirs src,lib` — comma-separated directories to analyze
  - `--format md|json` — output format (default: md)
  - `--out <file>` — write to file instead of stdout
  - `--max-issues <n>` — limit number of reported issues
- **fs-reader** (`src/fs-reader.ts`) — recursive file walker using Node `fs`, respects `isExcludedDir` from core, collects `.ts/.tsx` as `VirtualFile[]`.
- **CLI logic** (`src/cli.ts`) — argument parser, calls `analyzeCodebase()` and `buildMarkdownReport()` from core.
- **9 tests** — `parseDirs` (4 tests) and `filterByDirs` (5 tests) covering edge cases.
- **TypeScript config** — `packages/cli/tsconfig.json` extending base, referencing core and shared.
- **ESLint** — added `process` global to ESLint config for Node CLI code.
- **README** — added CLI section with 5 example commands, updated project structure and roadmap.

### Why

M6 goal: provide a headless CLI that proves packaging, filesystem integration, and deterministic output. Makes the project more accessible — users can try it without the web UI.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # 65 tests pass

# Test CLI against fixture repo
node packages/cli/dist/index.js analyze examples/fixture-repo --dirs src
node packages/cli/dist/index.js analyze examples/fixture-repo --format json --out test.json
```

### Design decisions

- **Reuses core engine** — no logic duplication; CLI is a thin wrapper around `analyzeCodebase()` and `buildMarkdownReport()`.
- **No global install needed** — runs via `node packages/cli/dist/index.js` or `npx` after publishing.
- **Deterministic output** — same files always produce same report (sorted paths, sorted issues).
- **process.exitCode over process.exit()** — allows cleanup and doesn't abort abruptly.

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

## 2026-03-06 — M7: Safe Auto-Fix CLI + Repomix Workflow Improvements

### What was implemented

- **Repomix workflow improvements** (`ai/scripts/generate-repomix-exports.ts`) — enhanced the changes-summary to include PR link (auto-detected from latest merged PR via `gh`), human summary bullets, known limitations, next milestone, and files changed sections. Added two pack modes: `repo-pack-full-vN.md` (base exclusions) and `repo-pack-core-vN.md` (also excludes docs, screenshots, .github).
- **Safe auto-fix CLI** (`packages/cli/src/fixer.ts`) — new `inspectorepo fix <path>` command that runs analysis, collects issues with safe `proposedDiff`, shows terminal preview, asks confirmation per fix, then patches files. Only applies fixes for `optional-chaining`, `boolean-simplification`, and `unused-imports` rules. Never auto-fixes `complexity-hotspot`.
- **Fixer tests** (`packages/cli/src/fixer.test.ts`) — 10 tests covering `isAutoFixable` (5 tests: each safe rule + rejection of complexity-hotspot + missing diff) and `parseDiff` (5 tests: optional chaining, boolean simplification, unused import removal, partial import, empty diff).
- **UI copy buttons** — DetailsPanel now has "Copy Suggested Fix" button on the Suggestion tab and "Copy Diff" button on the Diff tab (renamed from "Copy").
- **Updated CLI** — `parseArgs` now accepts both `analyze` and `fix` commands. Updated usage text to show both commands.

### Why

M7 brings the auto-fix preview feature — the first step toward automated code improvement. The repomix workflow improvements make milestone summaries more useful for external review.

### How to verify

```bash
npm run lint        # zero errors
npm run typecheck   # zero errors
npm run build       # all packages build
npm test            # all tests pass

# Test auto-fix against fixture repo
node packages/cli/dist/index.js fix examples/fixture-repo
```

### Design decisions

- **Interactive confirmation** — each fix requires explicit user confirmation to prevent accidental changes.
- **Safe rule allowlist** — only 3 rules are auto-fixable; `complexity-hotspot` is advisory only and never auto-applied.
- **Line-based replacement** — uses `String.indexOf` for safe text matching rather than regex, preventing regex injection.
- **Two pack modes** — core mode helps keep context smaller when only source code review is needed.
- **PR auto-detection** — uses `gh pr list` to find the latest merged PR; falls back to generic links if `gh` is unavailable.

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
