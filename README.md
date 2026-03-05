# InspectoRepo

A local web application that analyzes TypeScript + React codebases and produces structured code review suggestions with a VSCode-like interface.

## Why

Manual code review is time-consuming and inconsistent. InspectoRepo provides deterministic, AST-based analysis of TS/TSX files — surfacing real improvement opportunities with proposed diffs, all running locally with zero dependencies on paid APIs.

## Key Features (V1)

- **Folder selection** — pick a local codebase using File System Access API (Chrome/Edge) with a fallback `<input webkitdirectory>` upload
- **Directory tree** — browse top-level directories with checkboxes; defaults to `src/` if present
- **TS/TSX analysis engine** — deterministic pipeline: scan → parse (ts-morph in-memory) → apply rules → score → report
- **Issue list UI** — filterable by severity/search, with detail panel showing suggestions and proposed patches
- **Scoring** — 0–100 score based on issue severity counts
- **Markdown export** — download a full analysis report as `.md`
- **Exclude rules** — automatically skips `node_modules`, `dist`, `build`, `.git`, hidden dirs, and other noise
- **Monorepo architecture** — npm workspaces with `shared`, `core`, and `web` packages
- **CI pipeline** — GitHub Actions running lint, typecheck, build, and test on every push/PR

## Implemented Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `unused-imports` | warn | Detects unused import specifiers (default, namespace, named) and suggests removal with a safe proposed patch |
| `complexity-hotspot` | warn | Flags functions with high cyclomatic-like complexity (≥ 12) and suggests refactoring strategies |

## Planned Rules (Roadmap)

| Rule | Severity | Description |
|------|----------|-------------|
| `optional-chaining` | info | Suggest `?.` for manual null-check guard chains |
| `boolean-simplification` | info | Simplify `x === true`, `!!x`, ternaries returning boolean literals |
| `early-return` | info | Suggest guard clauses to reduce nesting |

## Tech Stack

| Layer    | Technology                |
| -------- | ------------------------- |
| Frontend | React 18 + TypeScript     |
| Bundler  | Vite                      |
| Analysis | ts-morph (TypeScript AST) |
| Testing  | Vitest                    |
| Monorepo | npm workspaces            |

## Project Structure

```
inspectorepo/
├── apps/
│   └── web/              # React frontend (Vite)
├── packages/
│   ├── core/             # Analysis engine (ts-morph, rules, scoring, report)
│   └── shared/           # Shared types (Issue, AnalysisReport, VirtualFile)
├── ai/                   # AI agent instructions & project context
├── docs/                 # Architecture, worklog, code walkthrough
└── package.json          # Root workspace config
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run checks
npm run lint
npm run typecheck
npm run build
npm test
```

## Scripts

| Script                | Description                  |
| --------------------- | ---------------------------- |
| `npm run dev`         | Start Vite dev server        |
| `npm run build`       | Build all packages + web app |
| `npm run lint`        | Lint all TS/TSX files        |
| `npm run typecheck`   | TypeScript type checking     |
| `npm run format`      | Format with Prettier         |
| `npm run format:check`| Check formatting             |
| `npm test`            | Run Vitest tests             |

## Demo

Try InspectoRepo locally in three steps:

1. **Clone the repository**
   ```bash
   git clone https://github.com/wai-coding/inspectorepo.git
   cd inspectorepo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server and analyze a folder**
   ```bash
   npm run dev
   ```
   Open the URL shown in the terminal. Click **Select Folder** (Chrome/Edge) or **Upload Folder** (any browser) to load a TypeScript project. Use the sidebar checkboxes to pick directories, then click **Analyze**. View issues in the main panel, click any issue to see details and proposed fixes, and click **Export .md** to download a Markdown report.

   > **Browser support:** The folder picker uses the File System Access API (Chrome/Edge). Other browsers can use the Upload Folder fallback.

## Interface Preview

![InspectoRepo UI](./screenshots/ui-layout.png)

> The screenshot above will show the VSCode-like dark interface with the file tree sidebar, issues list in the main panel, and detail/diff view on the right.

## Roadmap

### V1 (current)

- [x] Monorepo setup with npm workspaces
- [x] Core analysis engine skeleton
- [x] VSCode-like UI layout
- [x] File System Access API integration + fallback upload
- [x] Directory tree with selection
- [x] Real analysis pipeline (scan → parse → rules → score → report)
- [x] Rule: `unused-imports` — detect and suggest removal of unused imports
- [x] Rule: `complexity-hotspot` — flag high-complexity functions with refactor suggestions
- [ ] Rule: `optional-chaining` — suggest `?.` for guard chains (spec defined, stub in place)
- [ ] Rule: `boolean-simplification` — simplify redundant boolean expressions (spec defined, stub in place)
- [ ] Rule: `early-return` — suggest guard clauses to reduce nesting (spec defined, stub in place)
- [x] Issue list with severity filters + search
- [x] Detail panel with proposed patches + copy
- [x] Markdown report export
- [x] Scoring (0–100)

### V2 (planned)

- [ ] Auto-apply suggested fixes
- [ ] CLI package for headless analysis
- [ ] Custom rule authoring
- [ ] VS Code extension

## Screenshots

> Screenshots will be added as features are implemented.

## License

MIT
