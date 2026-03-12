# Changelog

## v8 — Post-Deploy Polish and AI-Assisted Development

- Rewrote README with live demo link, architecture overview, and AI-assisted development section
- Improved milestone summary generator with concrete bullet templates and stronger vague-phrase filtering
- Fixed next milestone suggestions to exclude already-shipped features like web app deployment
- Optimized browser bundle by separating React into its own vendor chunk alongside the existing analysis-engine chunk
- Updated documentation across architecture, worklog, and code walkthrough for deploy-readiness consistency

## v7 — Deploy Polish and Browser Separation

- Improved browser bundle architecture with a separate browser-safe entry point and lazy-loaded analysis engine
- Pinned Node engine to 20.x for stable Vercel deployments
- Strengthened rule-system alignment tests to prevent drift between rule registry, config defaults, and presets
- Polished web app onboarding with clearer browser capability fallback and step-by-step instructions
- Removed vague phrasing from export summary templates and added stricter bullet validation

## v6 — Conservative Rule Expansion

- Added 5 new conservative analysis rules: `no-console`, `no-empty-function`, `duplicate-imports`, `no-unreachable-after-return`, `no-throw-literal`
- All new rules registered in config defaults, all 4 presets, and rule registry
- Updated strict preset to elevate `no-console`, `no-unreachable-after-return`, and `no-throw-literal` to error severity
- Updated export workflow Known Limitations and ROADMAP for new rules
- Updated README with new rules table, configuration examples, and roadmap
- Added 20 new test cases covering all 5 new rules (194 total tests)

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
