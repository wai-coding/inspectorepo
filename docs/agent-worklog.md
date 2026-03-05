# Agent Worklog

Development log for InspectoRepo. Each entry describes what was implemented, why, and how to verify.

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
