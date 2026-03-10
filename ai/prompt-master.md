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

After EVERY PR merge into main (end of milestone):

1. Sync local `main`: `git fetch origin && git checkout main && git pull`
2. Run: `npm run repopack`
3. Confirm `ai/repomix-state.json` was incremented by 1
4. Confirm these three files now exist under `ai/exports/`:
   - `ai/exports/repo-pack-full-vN.md`
   - `ai/exports/repo-pack-core-vN.md`
   - `ai/exports/changes-summary-vN.md`
5. **STOP immediately** — do NOT commit the exports (they are git-ignored)
6. Tell the user to upload all three files to ChatGPT for full review

The version counter lives in `ai/repomix-state.json` (tracked). The exports live in `ai/exports/` (ignored).

### Enforcement Rules

> **The task is NOT complete until the repopack export files for the new version exist and the version counter was incremented.**

> **Do not describe the task as finished until you print the exact generated filenames.**

If `npm run repopack` fails or any of the three files is missing, the milestone is NOT done — fix the issue and re-run.

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

## Final Mandatory Checklist (after each merged milestone)

- [ ] PR merged into `main`
- [ ] `dev` synced with `main`
- [ ] `npm run repopack` executed
- [ ] Version incremented in `ai/repomix-state.json`
- [ ] `ai/exports/repo-pack-full-vN.md` exists
- [ ] `ai/exports/repo-pack-core-vN.md` exists
- [ ] `ai/exports/changes-summary-vN.md` exists
- [ ] Exact generated filenames printed
- [ ] User instructed to upload the 3 files to ChatGPT

---

## Non-negotiable completion rule

A task is NOT considered finished until ALL of the following conditions are satisfied:

1. The PR has been merged into main.
2. The local dev branch has been synced with main.
3. The command `npm run repopack` has been executed.
4. The value `currentVersion` in `ai/repomix-state.json` increased by exactly +1.
5. The following files exist in `ai/exports/` with that new version number:

   - `repo-pack-full-vN.md`
   - `repo-pack-core-vN.md`
   - `changes-summary-vN.md`

6. The agent must print the exact filenames generated.
7. The agent must STOP immediately afterwards.

The task MUST NOT be declared finished unless all checks above succeed.
