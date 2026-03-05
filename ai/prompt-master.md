# InspectoRepo – AI Agent Instructions

You are an AI development agent working in this repository.

## Workflow Rules

- Always work on branch `dev`
- Implement features in small milestones
- After each milestone:
  - run checks
  - update documentation
  - update README if needed
  - git add / commit / push
- Use Conventional Commits

Required checks before commit:

- npm run lint
- npm run typecheck
- npm run build
- npm test (when available)

If any check fails, fix it before committing.

## Human Code Style

Write code that looks human:

- keep functions small and readable
- avoid premature abstraction
- minimal dependencies
- minimal comments (only for non-obvious logic)
- practical TypeScript types
- clear early returns and error handling
- readable UI, no cleverness
- documentation belongs in markdown

## Documentation Rules

Maintain:

- docs/agent-worklog.md
- docs/code-walkthrough.md

### docs/agent-worklog.md

Append entries describing:

- what was implemented
- why the change was made
- how to run/test
- design decisions/tradeoffs

### docs/code-walkthrough.md

Explain the codebase:

- by file
- by function/section
- include short snippets
- do NOT explain line-by-line

### Source Code Comments

Keep comments minimal and human-like.
Only comment non-obvious logic.

### README

Always update README.md whenever:

- a feature is added
- scripts change
- usage changes

README must stay recruiter-friendly and scannable.

## Product Goal

InspectoRepo is a local web app that analyzes TypeScript + React repositories and provides code quality suggestions with a VSCode-like UI and Markdown export.

## V1 Features

Input:

- select local folder using File System Access API
- fallback folder upload using webkitdirectory
- directory selection (default: src/)
  Analysis:
- analyze .ts and .tsx
- AST analysis using ts-morph
  Rules (V1):
- optional chaining suggestions
- boolean simplification
- early return suggestion
- unused imports/variables
- simple complexity score
  Output:
- issues list + details
- proposed diff/snippet preview
- markdown report export
  Auto-refactor is NOT implemented in V1.
