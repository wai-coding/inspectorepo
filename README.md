# InspectoRepo

A local web application that analyzes TypeScript + React codebases and produces structured code review suggestions with a VSCode-like interface.

## Why

Manual code review is time-consuming and inconsistent. InspectoRepo provides deterministic, AST-based analysis of TS/TSX files — surfacing real improvement opportunities with proposed diffs, all running locally with zero dependencies on paid APIs.

## Key Features (V1)

- **Folder selection** — pick a local codebase using File System Access API (with drag-and-drop fallback)
- **TS/TSX analysis** — scans `.ts` and `.tsx` files using [ts-morph](https://ts-morph.com/)
- **Rule engine** — optional chaining, boolean simplification, early returns, unused imports, complexity scoring
- **Issue explorer** — VSCode-like UI with file tree, issue list, and detail panel
- **Diff preview** — see proposed fixes inline
- **Markdown export** — download a clean report for sharing or archiving

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
│   ├── core/             # Analysis engine (ts-morph, rules)
│   └── shared/           # Shared types (Issue, AnalysisReport, etc.)
├── ai/                   # AI agent instructions & project context
├── docs/                 # Worklog, code walkthrough
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
   git clone https://github.com/luiscastro193/inspectorepo.git
   cd inspectorepo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server and select a folder to analyze**
   ```bash
   npm run dev
   ```
   Open the URL shown in the terminal. Use the folder picker to select a local TypeScript/React project and view the analysis results.

## Interface Preview

![InspectoRepo UI](./screenshots/ui-layout.png)

> The screenshot above will show the VSCode-like dark interface with the file tree sidebar, issues list in the main panel, and detail/diff view on the right.

## Roadmap

### V1 (current)

- [x] Monorepo setup with npm workspaces
- [x] Core analysis engine skeleton
- [x] VSCode-like UI layout
- [ ] File System Access API integration
- [ ] Rule engine (optional chaining, boolean simplification, early returns, unused imports, complexity)
- [ ] Issue list + diff preview
- [ ] Markdown report export

### V2 (planned)

- [ ] Auto-apply suggested fixes
- [ ] CLI package for headless analysis
- [ ] Custom rule authoring
- [ ] VS Code extension

## Screenshots

> Screenshots will be added as features are implemented.

## License

MIT
