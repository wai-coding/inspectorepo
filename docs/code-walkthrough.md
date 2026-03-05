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

---

## `apps/web`

Vite + React + TypeScript frontend with a VSCode-like layout.

### `src/main.tsx`
App entry point. Renders `<App />` into `#root`.

### `src/App.tsx`
Root layout component. Composes `TopBar`, `Sidebar`, `MainPanel`, and `DetailsPanel` in a CSS flex layout.

### `src/components/TopBar.tsx`
Header bar with app title and status text.

### `src/components/Sidebar.tsx`
Left panel — will display the file tree once folder selection is implemented.

### `src/components/MainPanel.tsx`
Center panel — will show issues list and analysis results.

### `src/components/DetailsPanel.tsx`
Right panel — will show issue details and diff previews.

### `src/styles/global.css`
Dark theme with CSS custom properties (VSCode-inspired colors). Defines the flex layout grid.

