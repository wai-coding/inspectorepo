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

Flat ESLint config with TypeScript parser, React Hooks, and React Refresh plugins. Browser globals configured for DOM APIs.

### `vitest.config.ts`

Vitest configured to find test files in `packages/*/src/**/*.test.ts`.

### `LICENSE`

MIT License (copyright 2026 Luis Castro). Grants permission to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software.

---

## `.github/workflows/ci.yml`

GitHub Actions CI pipeline. Runs on every push to `main`/`dev` and on all pull requests. Steps: checkout, setup Node 20 with npm cache, `npm install`, lint, typecheck, build, test.

Uses `npm install` (not `npm ci`) because the repo does not commit a lockfile.

---

## `screenshots/`

### `screenshots/README.md`

Placeholder directory for UI screenshots. Will be populated as features are implemented.

---

## `ai/prompt-master.md` — PR Automation Section

Documents the automated PR workflow: after each milestone, the agent commits, pushes, creates a PR via `gh pr create`, merges via `gh pr merge`, and resets `dev` to `origin/main` using `git reset --hard` + `git push --force-with-lease`. Includes fallbacks for missing `gh` CLI, authentication issues, and branch protection.

---

## `packages/shared`

Shared type definitions used by both `core` and `web`.

### `src/types.ts`

Core data types:

- `Severity` — `'info' | 'warning' | 'error'`
- `Issue` — a single code quality finding (ruleId, message, location, optional diff)
- `AnalysisResult` — issues for one file
- `AnalysisReport` — full analysis output with summary stats

### `src/index.ts`

Re-exports all types from `types.ts`.

---

## `packages/core`

The analysis engine. Scans files, runs rules, produces reports.

### `src/scanner.ts`

File filtering utilities:

- `isAnalyzableFile(fileName)` — returns true for `.ts` / `.tsx`
- `filterAnalyzableFiles(fileNames)` — filters a list to only analyzable files

### `src/rule.ts`

The `Rule` interface — every analysis rule implements:

```ts
interface Rule {
  id: string;
  name: string;
  description: string;
  run(filePath: string, content: string): Issue[];
}
```

### `src/rules/placeholder.ts`

A no-op rule that always returns `[]`. Demonstrates the Rule interface contract.

### `src/analyzer.ts`

Main analysis orchestrator:

- `analyzeFiles(files, rules?)` — filters to analyzable files, runs all rules on each, aggregates into an `AnalysisReport`

### `src/analyzer.test.ts`

7 tests covering scanner filtering and analyzer behavior (empty input, file filtering, placeholder rule output).

### `src/file-filter.ts`

Exclude rules and directory tree utilities:

- `isExcludedDir(name)` — returns true for `node_modules`, `dist`, `build`, `.git`, hidden dirs, etc.
- `filterExcludedPaths(filePaths)` — drops any path containing an excluded directory segment
- `buildDirectoryTree(filePaths)` — groups files by top-level directory, returns `DirEntry[]` with name + count
- `pickDefaultDirs(dirs)` — selects `src` if present, otherwise first available directory
- `filterBySelectedDirs(filePaths, selectedDirs)` — keeps only files under selected top-level dirs

```ts
interface DirEntry {
  name: string;
  fileCount: number;
}
```

### `src/file-filter.test.ts`

16 tests covering:
- exclude rules (`isExcludedDir`)
- path filtering (`filterExcludedPaths`)
- directory tree building
- default directory selection
- filtering by selected directories

---

## `apps/web`

Vite + React + TypeScript frontend with a VSCode-like layout.

### `src/main.tsx`

App entry point. Renders `<App />` into `#root`.

### `src/App.tsx`

Root layout component. Composes `TopBar`, `Sidebar`, `MainPanel`, and `DetailsPanel`. Uses `useAppState` hook to manage folder/directory state and passes props to child components.

### `src/folder-reader.ts`

Browser folder input abstraction:

- `selectFolderViaAPI()` — uses File System Access API's `showDirectoryPicker()` (Chrome/Edge), recursively reads all files
- `readUploadedFiles(fileList)` — fallback using `<input webkitdirectory>`, extracts relative paths
- `processFiles(files)` — applies core exclude rules and TS/TSX filter to produce clean file list

Both methods return `{ name: string; files: VirtualFile[] }` where `VirtualFile` is `{ path: string; content: string }`.

### `src/useAppState.ts`

Central React state hook (`useAppState`) managing:
- `folderName` — selected folder name
- `allFiles` — processed (filtered) file list
- `dirs` / `selectedDirs` — directory tree and user selection
- `report` — analysis report (null until Analyze is clicked)

Exposes handlers: `handleSelectFolder`, `handleUploadFolder`, `toggleDir`, `handleAnalyze`, and a derived `canAnalyze` boolean. Persists selected directories in localStorage per folder name.

### `src/components/TopBar.tsx`

Header bar with app title, status text, and action buttons: "Select Folder" (primary), "Upload Folder" (fallback with hidden file input), and "Analyze" (enabled when folder + dirs are selected).

### `src/components/Sidebar.tsx`

Left panel showing directory tree. When a folder is loaded, displays a checkbox list of top-level directories with file counts. Checkboxes toggle directory selection.

### `src/components/MainPanel.tsx`

Center panel. Shows a placeholder prompt before analysis, an "empty state" when analysis returns zero issues, or a summary of found issues.

### `src/components/DetailsPanel.tsx`

Right panel — will show issue details and diff previews.

### `src/styles/global.css`

Dark theme with CSS custom properties (VSCode-inspired colors). Defines the flex layout grid, button styles (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-accent`), directory list styles (`.dir-list`, `.dir-label`), and empty state layout.
