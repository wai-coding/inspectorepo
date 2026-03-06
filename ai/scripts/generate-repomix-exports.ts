import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
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

// Run repomix via npx
const repomixOutput = join(EXPORTS_DIR, `repo-pack-v${nextVersion}.md`);

const repomixIgnore = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'out',
  'coverage',
  '.turbo',
  '.cache',
  'screenshots/*.webm',
  'ai/exports',
].join(',');

try {
  execSync(
    `npx repomix --output "${repomixOutput}" --ignore "${repomixIgnore}"`,
    { cwd: ROOT, stdio: 'inherit' },
  );
} catch {
  console.error('repomix failed — make sure npx is available');
  process.exit(1);
}

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
const latestMerge = run('git log --merges --oneline -1');

// Write changes summary
const summary = `# Changes Summary — v${nextVersion}

## Milestone

Version: v${nextVersion}

## Latest Merge

${latestMerge}

## Last 10 Commits

\`\`\`
${lastCommits}
\`\`\`

## Files Changed (last 10 commits)

\`\`\`
${filesChanged}
\`\`\`

## How to Regenerate

\`\`\`bash
npm run repopack
\`\`\`

This reads \`ai/repomix-state.json\`, increments the version, runs repomix, and writes:
- \`ai/exports/repo-pack-vN.md\` — full repository pack
- \`ai/exports/changes-summary-vN.md\` — this file
`;

const summaryPath = join(EXPORTS_DIR, `changes-summary-v${nextVersion}.md`);
writeFileSync(summaryPath, summary, 'utf-8');

// Update state file
state.currentVersion = nextVersion;
writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf-8');

console.log(`\nDone! Generated:`);
console.log(`  ${repomixOutput}`);
console.log(`  ${summaryPath}`);
console.log(`\nVersion updated to v${nextVersion} in ai/repomix-state.json`);
console.log(`\nReminder: Do NOT commit the files under ai/exports/.`);
