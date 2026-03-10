import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const STATE_PATH = join(ROOT, 'ai', 'repomix-state.json');
const EXPORTS_DIR = join(ROOT, 'ai', 'exports');

// Read current version
const state = JSON.parse(readFileSync(STATE_PATH, 'utf-8')) as {
  currentVersion: number;
};
const nextVersion = state.currentVersion + 1;

console.log(`Generating repomix exports v${nextVersion}...`);

// Ensure exports directory exists
if (!existsSync(EXPORTS_DIR)) {
  mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Shared ignore patterns for all repomix runs
const baseIgnore = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'coverage',
  '.turbo',
  '.cache',
  'ai/exports',
  'examples',
  'screenshots/*.webm',
];

// Core mode excludes additional directories
const coreExtraIgnore = [
  'screenshots',
  'docs',
  '.github',
];

function runRepomix(outputPath: string, ignoreList: string[]): void {
  const ignore = ignoreList.join(',');
  try {
    execSync(
      `npx repomix --output "${outputPath}" --ignore "${ignore}"`,
      { cwd: ROOT, stdio: 'inherit' },
    );
  } catch {
    console.error('repomix failed — make sure npx is available');
    process.exit(1);
  }
}

// Generate full pack (excludes base noise)
const fullOutput = join(EXPORTS_DIR, `repo-pack-full-v${nextVersion}.md`);
console.log('Generating full repo pack...');
runRepomix(fullOutput, baseIgnore);

// Generate core pack (excludes base + docs/screenshots/.github)
const coreOutput = join(EXPORTS_DIR, `repo-pack-core-v${nextVersion}.md`);
console.log('Generating core repo pack...');
runRepomix(coreOutput, [...baseIgnore, ...coreExtraIgnore]);

// Gather git info for changes summary
function run(cmd: string): string {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8' }).trim();
  } catch {
    return '(unavailable)';
  }
}

const lastCommits = run('git log --oneline -10');
const filesChanged = run('git diff HEAD~10 --name-only');

// Detect latest merged PR link
const repoUrl = run('git remote get-url origin')
  .replace(/\.git$/, '')
  .replace(/^git@github\.com:/, 'https://github.com/');

function getLatestPRInfo(): { prLink: string; compareLink: string } {
  const prNumber = run('gh pr list --state merged --limit 1 --json number --jq ".[0].number"');
  if (prNumber && prNumber !== '(unavailable)' && /^\d+$/.test(prNumber)) {
    return {
      prLink: `${repoUrl}/pull/${prNumber}`,
      compareLink: `${repoUrl}/compare/v${nextVersion - 1}...v${nextVersion}`,
    };
  }
  return {
    prLink: `${repoUrl}/pulls (check latest)`,
    compareLink: `${repoUrl}/compare/main...dev`,
  };
}

const { prLink, compareLink } = getLatestPRInfo();

// Write changes summary
const summary = `# InspectoRepo — Milestone v${nextVersion}

## PR
PR: ${prLink}
Compare: ${compareLink}

## Human Summary
(Fill in after merge — describe what changed in this milestone)

## Changes

\`\`\`
${lastCommits}
\`\`\`

## Files Changed

\`\`\`
${filesChanged}
\`\`\`

## Known Limitations
- Auto-fix only supports 3 rules (optional-chaining, boolean-simplification, unused-imports)
- No custom rule authoring yet
- Complexity-hotspot is advisory only — no auto-fix support
- Browser folder picker requires Chrome/Edge (File System Access API)

## Next Milestone
- Add custom rule authoring API for user-defined rules
- VS Code extension for in-editor analysis
- Expand auto-fix to support more rule types

## Regenerate

\`\`\`bash
npm run repopack
\`\`\`

This reads \`ai/repomix-state.json\`, increments the version, runs repomix, and writes:
- \`ai/exports/repo-pack-full-vN.md\` — full repository pack
- \`ai/exports/repo-pack-core-vN.md\` — core-only pack (no docs/screenshots/.github)
- \`ai/exports/changes-summary-vN.md\` — this file
`;

const summaryPath = join(EXPORTS_DIR, `changes-summary-v${nextVersion}.md`);
writeFileSync(summaryPath, summary, 'utf-8');

// Update state
writeFileSync(STATE_PATH, JSON.stringify({ currentVersion: nextVersion }, null, 2) + '\n', 'utf-8');
console.log(`\nDone! v${nextVersion} exports written to ai/exports/`);
console.log(`  - repo-pack-full-v${nextVersion}.md`);
console.log(`  - repo-pack-core-v${nextVersion}.md`);
console.log(`  - changes-summary-v${nextVersion}.md`);
console.log(`\nVersion updated to v${nextVersion} in ai/repomix-state.json`);
console.log(`\nReminder: Do NOT commit the files under ai/exports/.`);
