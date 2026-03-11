# Changelog

## v5 — Summary Polish and Config Coverage

- Improved human summary generator with complete sentence enforcement and deploy-readiness detection
- Expanded config test coverage to verify all rules are wired into defaults, presets, and registry
- Added deployment readiness section to README
- Strengthened export workflow bullet validation with period-ending requirement

## v4 — Tooling Improvements

- Stronger auto-fix engine with detailed skip reporting
- Monorepo-aware package summaries in CLI and PR comments
- HTML report improvements
- Conservative rules: no-debugger, no-empty-catch, no-useless-return
- Diagnostics-backed analysis via ts-diagnostics rule
- Richer complexity warnings with per-function contributor breakdown
- Export workflow improvements and human summary quality enforcement
- Lightweight repo-pack-latest export mode
- Deploy readiness improvements for the web UI

## v3 — Platform

- Custom rule authoring API (`defineRule()`)
- Rule presets: `recommended`, `strict`, `cleanup`, `react`
- Fix preview mode (`inspectorepo fix --preview`)
- Monorepo-aware analysis with per-package score breakdown
- Web UI improvements: severity color-coded rows, expandable inline details, search filtering
- VS Code extension for in-editor analysis
- Summary-only CLI mode (`inspectorepo analyze --summary-only`)
- Improved PR comment summaries with top rules and affected packages
- About section and empty-state UX in web app
- Lightweight `repo-pack-latest` export mode
- Additional fixture data for React components and monorepo layouts

## v2 — Automation

- Headless CLI for terminal-based analysis (`inspectorepo analyze`)
- Interactive auto-fix command (`inspectorepo fix`)
- GitHub Action running analysis on every pull request
- PR comment bot posting score and severity breakdown
- HTML report export
- Report parser for extracting summary metrics

## v1 — Foundation

- Monorepo setup with npm workspaces (`shared`, `core`, `cli`, `web`)
- Core analysis engine: scan → parse (ts-morph) → apply rules → score → report
- Five built-in rules: `unused-imports`, `complexity-hotspot`, `optional-chaining`, `boolean-simplification`, `early-return`
- VSCode-like dark UI with sidebar, main panel, and details panel
- File System Access API folder picker with `<input webkitdirectory>` fallback
- Markdown report export
- Scoring system (0–100)
- Rule configuration via `.inspectorepo.json`
- Ignore file support (`.inspectorepoignore`)
