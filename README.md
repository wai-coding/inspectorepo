# InspectoRepo

A TypeScript code analysis tool that runs entirely in the browser. Analyze any TypeScript or React codebase, get actionable improvement suggestions with proposed fixes, and export detailed reports — all without sending a single line of code to a server.

## Live Demo

InspectoRepo is deployed and publicly accessible here:

**https://inspectorepo.vercel.app**

- The app runs entirely in the browser — no server-side processing
- Analyze local projects by selecting a folder or uploading files
- No code leaves the browser; all analysis happens client-side via an in-memory TypeScript compiler

## Key Features

- **14 built-in analysis rules** — from unused imports and complexity hotspots to optional chaining suggestions and boolean simplifications
- **AST-based detection** — powered by ts-morph for accurate, deterministic analysis with zero false positives on supported patterns
- **Auto-fix support** — 6 rules support safe auto-fix via the CLI with interactive confirmation or preview mode
- **Rule presets** — `recommended`, `strict`, `cleanup`, `react` — with per-rule severity overrides via `.inspectorepo.json`
- **Custom rule API** — extend the engine with `defineRule()` and pass custom rules directly into the analyzer
- **Browser-safe architecture** — heavy dependencies (ts-morph) are lazy-loaded only when analysis starts, keeping the initial page load fast
- **Monorepo-aware** — per-package scoring and issue grouping for multi-package codebases
- **Multiple output formats** — Markdown, HTML, and JSON report export from both CLI and web UI
- **CLI + Web + VS Code** — analyze from the terminal, browser, or directly inside the editor
- **GitHub Action** — automated analysis on every pull request with score and severity summary as a PR comment

## Example Output

See [examples/sample-report.md](./examples/sample-report.md) for a full analysis report. The report includes severity-tagged issues, proposed diffs in collapsible details, and a 0–100 quality score.

## Architecture Overview

```
inspectorepo/
├── apps/web/              # React frontend (Vite) — browser-based analysis UI
├── packages/
│   ├── core/              # Analysis engine (ts-morph, rules, scoring, report)
│   │   ├── index.ts       # Full API (depends on ts-morph)
│   │   └── browser.ts     # Browser-safe API (no ts-morph dependency)
│   ├── shared/            # Shared types (Issue, AnalysisReport, VirtualFile)
│   ├── cli/               # Headless CLI for terminal-based analysis
│   └── vscode-extension/  # VS Code extension for in-editor analysis
├── examples/              # Fixture files and sample reports
├── ai/                    # AI agent instructions and repomix export tooling
└── docs/                  # Architecture docs, worklog, code walkthrough
```

| Layer    | Technology                |
| -------- | ------------------------- |
| Frontend | React 18 + TypeScript     |
| Bundler  | Vite                      |
| Analysis | ts-morph (TypeScript AST) |
| Testing  | Vitest                    |
| Monorepo | npm workspaces            |
| Node     | 20.x (LTS)               |
| Deploy   | Vercel                    |

**Browser bundle strategy:** The web app imports only from `@inspectorepo/core/browser` at load time — a lightweight entry point with zero ts-morph dependency. The full analysis engine is lazy-loaded via dynamic `import()` only when the user clicks Analyze, keeping the initial bundle small and the page load fast.

## Rules

| Rule | Severity | Auto-fix | Description |
|------|----------|----------|-------------|
| `unused-imports` | warn | yes | Detects unused import specifiers and suggests removal |
| `complexity-hotspot` | warn | no | Flags high-complexity functions with contributor breakdown |
| `optional-chaining` | info | yes | Suggests `?.` for monotonic guard chains |
| `boolean-simplification` | info | yes | Simplifies redundant boolean expressions |
| `early-return` | info | yes | Detects unnecessary block-style early returns |
| `no-debugger` | warn | yes | Detects leftover `debugger` statements |
| `no-empty-catch` | warn | no | Flags empty catch blocks that hide errors |
| `no-useless-return` | info | yes | Detects redundant `return;` at end of functions |
| `ts-diagnostics` | error | no | Reports high-confidence TypeScript compiler diagnostics |
| `no-console` | warn | no | Detects console calls left in production code |
| `no-empty-function` | info | no | Flags empty function bodies |
| `duplicate-imports` | info | no | Detects multiple imports from the same module |
| `no-unreachable-after-return` | warn | no | Flags unreachable code after return/throw/break/continue |
| `no-throw-literal` | warn | no | Detects throwing literals instead of Error objects |

## Development Workflow

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run all checks
npm run lint
npm run typecheck
npm run build
npm test
```

| Script                | Description                  |
| --------------------- | ---------------------------- |
| `npm run dev`         | Start Vite dev server        |
| `npm run build`       | Build all packages + web app |
| `npm run lint`        | Lint all TS/TSX files        |
| `npm run typecheck`   | TypeScript type checking     |
| `npm run format`      | Format with Prettier         |
| `npm test`            | Run Vitest tests             |
| `npm run repopack`   | Generate repomix exports     |

## CLI

```bash
# Analyze a project
inspectorepo analyze ./my-project --dirs src --format md

# Apply safe auto-fixes interactively
inspectorepo fix ./my-project

# Preview fixes without modifying files
inspectorepo fix ./my-project --preview

# Use a rule preset
inspectorepo analyze ./my-project --preset strict
```

## Configuration

Create `.inspectorepo.json` in your project root:

```json
{
  "preset": "recommended",
  "rules": {
    "complexity-hotspot": "off",
    "unused-imports": "error"
  }
}
```

Presets: `recommended` (balanced defaults), `strict` (elevated severity), `cleanup` (style-focused), `react` (React/TS projects).

## AI-Assisted Development

This project was intentionally built using AI agents to explore the boundaries of AI-assisted software development.

- Development was done using GitHub Copilot agents inside VS Code, with the AI handling implementation, testing, documentation, and deployment tasks
- The goal was to experiment with AI-assisted development workflows — understanding where autonomous coding agents excel and where human oversight remains essential
- The repository includes prompt engineering tooling (`ai/prompt-master.md`) and automated export scripts that document the agent's work and reasoning across milestones
- Each milestone was planned, implemented, validated, and merged through a structured agent workflow with conventional commits and CI checks

The approach is pragmatic: AI agents handled the repetitive scaffolding, test generation, and documentation updates, while architectural decisions and quality standards were guided by human review.

## Deployment

InspectoRepo is deployed on Vercel at **https://inspectorepo.vercel.app**.

The web app is a standard Vite/React static build. It runs the same analysis engine as the CLI — ts-morph executes entirely in the browser via an in-memory file system. No code is uploaded or processed on any server.

**Browser support:** Folder selection requires the File System Access API (Chrome/Edge). Other browsers can use the Upload Folder fallback or the built-in sample project.

## Future Improvements

- Additional safe rules for common anti-patterns (magic numbers, nested callbacks)
- Deeper analysis diagnostics with cross-file dependency tracking
- Performance optimization for large monorepo codebases
- Optional server-side analysis endpoint for CI integration
- VS Code extension inline fix suggestions

## License

MIT
