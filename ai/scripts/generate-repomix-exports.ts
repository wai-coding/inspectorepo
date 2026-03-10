import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const EXPORTS_DIR = join(ROOT, 'ai', 'exports');

const EXPORT_PATTERN = /^(?:repo-pack-full|repo-pack-core|changes-summary)-v(\d+)\.md$/;

function run(cmd: string): string {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

// Derive version from existing export filenames
function getHighestVersion(): number {
  if (!existsSync(EXPORTS_DIR)) return 0;
  const files = readdirSync(EXPORTS_DIR);
  let highest = 0;
  for (const f of files) {
    const match = EXPORT_PATTERN.exec(f);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > highest) highest = n;
    }
  }
  return highest;
}

// Delete all export files that don't match the given version
function deleteOldVersions(keepVersion: number): void {
  const files = readdirSync(EXPORTS_DIR);
  for (const f of files) {
    const match = EXPORT_PATTERN.exec(f);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n !== keepVersion) {
        unlinkSync(join(EXPORTS_DIR, f));
      }
    }
  }
}

// --- PR metadata extraction ---

interface PRInfo {
  number: string;
  title: string;
  body: string;
  prLink: string;
  compareLink: string;
  mergeCommitSha: string;
}

const repoUrl = run('git remote get-url origin')
  .replace(/\.git$/, '')
  .replace(/^git@github\.com:/, 'https://github.com/');

function getLatestPRInfo(): PRInfo {
  const raw = run('gh pr list --state merged --limit 1 --json number,title,body,mergeCommit --jq ".[0]"');
  if (raw) {
    try {
      const pr = JSON.parse(raw);
      const num = String(pr.number ?? '');
      if (/^\d+$/.test(num)) {
        return {
          number: num,
          title: pr.title ?? '',
          body: pr.body ?? '',
          prLink: `${repoUrl}/pull/${num}`,
          compareLink: `${repoUrl}/pull/${num}/files`,
          mergeCommitSha: pr.mergeCommit?.oid ?? '',
        };
      }
    } catch { /* fall through */ }
  }
  return {
    number: '',
    title: '',
    body: '',
    prLink: `${repoUrl}/pulls (check latest)`,
    compareLink: `${repoUrl}/compare/main...dev`,
    mergeCommitSha: '',
  };
}

// --- Files changed scoped to latest milestone ---

function getMilestoneFilesChanged(pr: PRInfo): string[] {
  // Strategy 1: use gh to get PR files directly (most reliable cross-platform)
  if (pr.number) {
    const ghFiles = run(`gh pr diff ${pr.number} --name-only`);
    if (ghFiles) return ghFiles.split('\n').filter(Boolean).sort();
  }

  // Strategy 2: use merge commit parents via rev-parse (avoids ^ escaping issues)
  if (pr.mergeCommitSha) {
    const parent1 = run(`git rev-parse ${pr.mergeCommitSha}~1`);
    const parent2 = run(`git log --format=%H ${pr.mergeCommitSha} --max-count=1`);
    if (parent1 && parent2) {
      const files = run(`git diff ${parent1}..${parent2} --name-only`);
      if (files) return files.split('\n').filter(Boolean).sort();
    }
  }

  // Strategy 3: latest merge commit on main
  const mergeLog = run('git log --merges --format=%H -1 main');
  if (mergeLog) {
    const parent = run(`git rev-parse ${mergeLog}~1`);
    if (parent) {
      const files = run(`git diff ${parent}..${mergeLog} --name-only`);
      if (files) return files.split('\n').filter(Boolean).sort();
    }
  }

  // Fallback: diff between HEAD and its parent
  const files = run('git diff HEAD~1 --name-only');
  return files ? files.split('\n').filter(Boolean).sort() : [];
}

// --- Human summary generation ---

function categorizeFiles(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const f of files) {
    let area = 'other';
    if (f.startsWith('packages/core/')) area = 'core';
    else if (f.startsWith('packages/cli/')) area = 'cli';
    else if (f.startsWith('packages/shared/')) area = 'shared';
    else if (f.startsWith('apps/web/')) area = 'web';
    else if (f.startsWith('docs/')) area = 'docs';
    else if (f.startsWith('ai/')) area = 'ai';
    else if (f.startsWith('.github/')) area = 'workflow';
    else if (f.startsWith('examples/')) area = 'examples';
    else if (f.startsWith('screenshots/')) area = 'screenshots';
    else if (f === 'README.md' || f === 'package.json') area = 'root';
    const list = groups.get(area) ?? [];
    list.push(f);
    groups.set(area, list);
  }
  return groups;
}

const AREA_LABELS: Record<string, string> = {
  core: 'core analysis engine',
  cli: 'CLI package',
  shared: 'shared types',
  web: 'web frontend',
  docs: 'documentation',
  ai: 'AI agent instructions/exports',
  workflow: 'GitHub Actions workflows',
  examples: 'example fixtures',
  screenshots: 'screenshots/automation',
  root: 'root config',
  other: 'project files',
};

function generateHumanSummary(pr: PRInfo, files: string[], commits: string): string[] {
  const bullets: string[] = [];

  // Use PR title as first bullet if available
  if (pr.title) {
    bullets.push(pr.title);
  }

  // Extract key points from PR body if available
  if (pr.body) {
    const lines = pr.body.split('\n')
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 10 && l.length < 200 && !l.startsWith('#') && !l.startsWith('```'))
      .filter(l => !PLACEHOLDER_WORD_PATTERNS.some(p => p.test(l)));
    for (const line of lines.slice(0, 3)) {
      if (!bullets.some(b => b.toLowerCase() === line.toLowerCase())) {
        bullets.push(line);
      }
    }
  }

  // Generate area-based bullets from changed files
  const groups = categorizeFiles(files);
  for (const [area, areaFiles] of groups) {
    if (bullets.length >= 6) break;
    const label = AREA_LABELS[area] ?? area;
    const bullet = `Updated ${label} (${areaFiles.length} file${areaFiles.length === 1 ? '' : 's'})`;
    if (!bullets.some(b => b.toLowerCase().includes(label))) {
      bullets.push(bullet);
    }
  }

  // If still not enough, extract from recent commit subjects
  if (bullets.length < 3 && commits) {
    const subjects = commits.split('\n')
      .map(l => l.replace(/^[a-f0-9]+ /, ''))
      .filter(Boolean);
    for (const sub of subjects.slice(0, 3)) {
      if (bullets.length >= 6) break;
      if (!bullets.some(b => b.toLowerCase() === sub.toLowerCase())) {
        bullets.push(sub);
      }
    }
  }

  return bullets.slice(0, 6);
}

// --- Summary content validation ---

const PLACEHOLDER_PHRASES = [
  'fill in after merge',
  'describe what changed',
];

// Regex patterns for word-boundary matching to avoid false positives
const PLACEHOLDER_WORD_PATTERNS = [
  /\btodo\b/i,
  /\bplaceholder\b/i,
  /\btbd\b/i,
];

function validateSummaryContent(content: string): void {
  // Check for placeholder phrases (exact substrings)
  const lower = content.toLowerCase();
  for (const phrase of PLACEHOLDER_PHRASES) {
    if (lower.includes(phrase)) {
      console.error(`\nERROR: Summary contains placeholder text: "${phrase}"`);
      process.exit(1);
    }
  }

  // Check for placeholder words (word-boundary match in Human Summary section only)
  const humanSection = content.match(/## Human Summary\n([\s\S]*?)(?=\n##|$)/);
  if (humanSection) {
    for (const pattern of PLACEHOLDER_WORD_PATTERNS) {
      if (pattern.test(humanSection[1])) {
        console.error(`\nERROR: Human Summary contains placeholder word matching: ${pattern}`);
        process.exit(1);
      }
    }
  }

  // Check Human Summary has at least 3 bullets
  const summarySection = content.match(/## Human Summary\n([\s\S]*?)(?=\n##|$)/);
  if (summarySection) {
    const bulletCount = (summarySection[1].match(/^- /gm) ?? []).length;
    if (bulletCount < 3) {
      console.error(`\nERROR: Human Summary has only ${bulletCount} bullets (need at least 3)`);
      process.exit(1);
    }
  } else {
    console.error('\nERROR: Human Summary section not found in changes-summary');
    process.exit(1);
  }

  // Check Files Changed is not empty
  const filesSection = content.match(/## Files Changed\n\n```\n([\s\S]*?)```/);
  if (!filesSection || !filesSection[1].trim()) {
    console.error('\nERROR: Files Changed section is empty');
    process.exit(1);
  }
}

// ============================================================
// Main script
// ============================================================

const previousVersion = getHighestVersion();
const nextVersion = previousVersion + 1;

console.log(`Generating repomix exports v${nextVersion}...`);

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

// Generate full pack
const fullOutput = join(EXPORTS_DIR, `repo-pack-full-v${nextVersion}.md`);
console.log('Generating full repo pack...');
runRepomix(fullOutput, baseIgnore);

// Generate core pack
const coreOutput = join(EXPORTS_DIR, `repo-pack-core-v${nextVersion}.md`);
console.log('Generating core repo pack...');
runRepomix(coreOutput, [...baseIgnore, ...coreExtraIgnore]);

// Gather milestone-specific data
const prInfo = getLatestPRInfo();
const milestoneFiles = getMilestoneFilesChanged(prInfo);
const recentCommits = run('git log --oneline -10');
const humanBullets = generateHumanSummary(prInfo, milestoneFiles, recentCommits);

// Build changes summary
const summary = `# InspectoRepo — Milestone v${nextVersion}

## PR
PR: ${prInfo.prLink}
Compare: ${prInfo.compareLink}

## Human Summary
${humanBullets.map(b => `- ${b}`).join('\n')}

## Changes

\`\`\`
${recentCommits}
\`\`\`

## Files Changed

\`\`\`
${milestoneFiles.join('\n')}
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

This scans \`ai/exports/\` for existing versioned files, increments the version, runs repomix, and writes:
- \`ai/exports/repo-pack-full-vN.md\` — full repository pack
- \`ai/exports/repo-pack-core-vN.md\` — core-only pack (no docs/screenshots/.github)
- \`ai/exports/changes-summary-vN.md\` — this file
`;

const summaryPath = join(EXPORTS_DIR, `changes-summary-v${nextVersion}.md`);
writeFileSync(summaryPath, summary, 'utf-8');

// Validate summary content before proceeding
console.log('\nValidating changes-summary content...');
const writtenContent = readFileSync(summaryPath, 'utf-8');
validateSummaryContent(writtenContent);
console.log('Summary validation passed.');

// Verify all 3 files exist
const generatedFiles = [fullOutput, coreOutput, summaryPath];
const missing = generatedFiles.filter(f => !existsSync(f));

if (missing.length > 0) {
  console.error('\nERROR: The following export files are missing after generation:');
  for (const f of missing) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

// Verify new version is strictly greater than previous
if (nextVersion <= previousVersion) {
  console.error(`\nERROR: New version (v${nextVersion}) is not greater than previous version (v${previousVersion})`);
  process.exit(1);
}

// Delete old versions only after all files verified
deleteOldVersions(nextVersion);

// Verify old versions were actually removed
const remainingFiles = readdirSync(EXPORTS_DIR);
const staleFiles = remainingFiles.filter(f => {
  const match = EXPORT_PATTERN.exec(f);
  return match && parseInt(match[1], 10) !== nextVersion;
});

if (staleFiles.length > 0) {
  console.error('\nERROR: Old export versions still remain after cleanup:');
  for (const f of staleFiles) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

// Verify only the expected 3 files remain for the new version
const expectedFiles = [
  `repo-pack-full-v${nextVersion}.md`,
  `repo-pack-core-v${nextVersion}.md`,
  `changes-summary-v${nextVersion}.md`,
];
const actualExportFiles = remainingFiles.filter(f => EXPORT_PATTERN.test(f));
if (actualExportFiles.length !== expectedFiles.length) {
  console.error(`\nERROR: Expected ${expectedFiles.length} export files, found ${actualExportFiles.length}`);
  process.exit(1);
}

console.log('');
console.log('----------------------------------------');
console.log('Repomix export successful');
console.log('');
console.log(`Previous version: ${previousVersion > 0 ? `v${previousVersion}` : '(none)'}`);
console.log(`New version: v${nextVersion}`);
console.log('');
console.log('Generated files:');
console.log(`  ai/exports/repo-pack-full-v${nextVersion}.md`);
console.log(`  ai/exports/repo-pack-core-v${nextVersion}.md`);
console.log(`  ai/exports/changes-summary-v${nextVersion}.md`);
console.log('');
console.log('Old versions deleted: YES');
console.log('Summary validation passed: YES');
console.log('----------------------------------------');
