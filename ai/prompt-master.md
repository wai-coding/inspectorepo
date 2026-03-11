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

## Pull Request Automation

After every successful milestone or feature implementation:

1. `git add -A`
2. `git commit` (using Conventional Commits)
3. `git push origin dev`

Then automatically create a Pull Request from `dev` → `main` using GitHub CLI:

```bash
gh pr create --base main --head dev --title "<commit title>" --body "<summary of changes and checks passed>"
```

Then merge the PR:

```bash
gh pr merge --merge --delete-branch=false
```

After merging, reset `dev` to match `main` exactly (avoids merge commits and drift):

```bash
git fetch origin
git checkout dev
git reset --hard origin/main
git push --force-with-lease origin dev
```

> **Why `reset --hard` + `force-with-lease`?**  
> `git pull origin main` can create unexpected merge commits when `dev` has diverged.  
> A hard reset makes `dev` an exact copy of `main`, and `--force-with-lease` prevents overwriting work that another collaborator may have pushed in the meantime.

### Safe Fallbacks

- **If `gh` is not installed** → log manual instructions in `docs/agent-worklog.md` and provide install link (`https://cli.github.com/`)
- **If `gh` is not authenticated** → instruct to run `gh auth login` and document in worklog
- **If branch protection prevents merge** → document the issue in `docs/agent-worklog.md` and stop after PR creation (do not force merge)

## Post-Merge Repomix Export

After EVERY PR merge into main (end of milestone), execute these steps in order:

1. Merge the PR into `main`
2. Sync `dev` with `main` (`git reset --hard origin/main` + `git push --force-with-lease`)
3. Determine the previous highest export version in `ai/exports/` (e.g. v9)
4. Run: `npm run repopack`
5. Confirm the new version is strictly greater than the previous (e.g. v10 > v9)
6. Confirm only the latest export files remain in `ai/exports/` — no older versions
7. Print previous version, new version, and exact filenames of the 3 generated files
8. **STOP** — do NOT commit the exports (they are git-ignored). Tell the user to upload all three files to ChatGPT.

Version is derived from existing filenames in `ai/exports/`. If no exports exist, the script starts at v1. The script deletes older versions automatically after validating the new set.

If `npm run repopack` fails or any file is missing, the milestone is NOT done — fix and re-run.

### Changes Summary Requirements

The generated `changes-summary-vN.md` must:
- Contain auto-generated Human Summary bullets derived from PR metadata and changed files — never placeholder text
- Scope Files Changed to only the latest merged PR/milestone — not a broad history window
- Pass validation: at least 3 human summary bullets, no placeholder phrases, non-empty Files Changed

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

---

## Completion Rule

A task is NOT finished until:

1. PR merged into `main`
2. `dev` synced with `main`
3. `npm run repopack` executed
4. New version > previous highest version
5. `ai/exports/repo-pack-full-vN.md`, `repo-pack-core-vN.md`, `repo-pack-latest-vN.md`, `changes-summary-vN.md` exist
6. `changes-summary-vN.md` contains auto-generated human summary bullets (no placeholders), and Files Changed scoped to the latest merged milestone only
7. Old export versions deleted — only the latest remains
8. Previous version, new version, and exact filenames printed
9. User instructed to upload the 4 files to ChatGPT

The task MUST NOT be declared finished unless all checks above succeed.
