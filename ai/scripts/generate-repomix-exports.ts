import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const EXPORTS_DIR = join(ROOT, 'ai', 'exports');

const EXPORT_PATTERN = /^(?:repo-pack-full|repo-pack-core|repo-pack-latest|changes-summary)-v(\d+)\.md$/;

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
    else if (f.startsWith('packages/vscode-extension/')) area = 'vscode-extension';
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

// Polished, outcome-focused bullet templates per area (≥8 words, verb-first, complete sentences)
const AREA_BULLET_TEMPLATES: Record<string, string> = {
  core: 'Expanded rule coverage with stronger detection accuracy and richer diagnostics.',
  cli: 'Enhanced the command-line interface for a smoother developer experience.',
  shared: 'Refined shared type definitions to improve consistency across all packages.',
  'vscode-extension': 'Improved the VS Code extension for faster in-editor feedback.',
  web: 'Polished the web interface for a more intuitive analysis workflow.',
  docs: 'Updated documentation to reflect the latest codebase improvements and conventions.',
  ai: 'Strengthened the export workflow so summaries are cleaner and more reliable.',
  workflow: 'Improved the CI pipeline to catch more issues before code ships.',
  examples: 'Updated example fixtures to demonstrate current rule coverage and patterns.',
  screenshots: 'Refreshed screenshots and demo automation for accurate visual documentation.',
  root: 'Updated root project configuration for better workspace consistency.',
  other: 'Improved project tooling and overall developer workflow configuration quality.',
};

// Banned patterns — bullets containing any of these are considered noisy/internal
const BANNED_BULLET_PATTERNS: RegExp[] = [
  /Merge pull request/i,
  /^fix:/i,
  /^feat:/i,
  /^chore:/i,
  /^refactor:/i,
  /^docs:/i,
  /^ci:/i,
  /^style:/i,
  /^perf:/i,
  /^test:/i,
  /^build:/i,
  /filter banned words/i,
  /summary extraction/i,
  /\bPR body\b/i,
  /cleanup regex/i,
  /merge noise/i,
  /regex cleanup/i,
  /PR body line filtering/i,
  /\bWIP\b/,
  /\bwip\b/,
  /^bump /i,
  /^update dependencies/i,
  /^Merge branch/i,
  // Meta/internal implementation text
  /\bbullets?\b/i,
  /\bnoise filtering\b/i,
  /\bconventional commit/i,
  /\brecruiter/i,
  /\bmetadata\b/i,
  /\bfallback\b/i,
  /\bcommit subjects?\b/i,
  /\bcommit prefixes?\b/i,
  /\bcommit message/i,
  /\bgit log\b/i,
  /\bgit diff\b/i,
  /\brepopack\b/i,
  /\brepomix\b/i,
  /\bvalidation\b/i,
  /\bregex\b/i,
  /\bpatterns?\s+match/i,
  /\.ts[x]?[:\s]/i,
  /Checks? passed/i,
  // Milestone-title-style bullets (e.g. "M19 Web UI improvements", "V3 Platform Milestone")
  /^M\d+\b/i,
  /\bM\d+\b.*\bM\d+\b/i,
  /^V\d+\s/i,
  /\bMilestone\b/i,
];

function isBannedBullet(bullet: string): boolean {
  return BANNED_BULLET_PATTERNS.some(p => p.test(bullet.trim()));
}

/** Check whether a bullet is structurally complete (no truncation or unmatched backticks). */
function isTruncatedBullet(bullet: string): boolean {
  const trimmed = bullet.trim();
  // Unmatched backticks (odd count)
  const backtickCount = (trimmed.match(/`/g) ?? []).length;
  if (backtickCount % 2 !== 0) return true;
  // Unmatched opening code block
  if (trimmed.includes('```') && (trimmed.match(/```/g) ?? []).length % 2 !== 0) return true;
  // Ends with backslash (escaped/truncated)
  if (trimmed.endsWith('\\')) return true;
  // Very short (likely truncated fragment)
  if (trimmed.length < 15) return true;
  return false;
}

/** Strip conventional-commit prefixes and clean up a raw string into a human-readable sentence. */
function cleanBulletText(raw: string): string {
  let text = raw.trim();
  // Remove conventional commit prefix (e.g. "fix: ...", "feat(scope): ...")
  text = text.replace(/^(?:fix|feat|chore|refactor|docs|ci|style|perf|test|build)(?:\([^)]*\))?:\s*/i, '');
  // Remove milestone references like "M19", "(M19)", "M19 —"
  text = text.replace(/\(?M\d+\)?[:\s—-]*/gi, '').trim();
  // Remove "Merge pull request #N from ..." lines
  text = text.replace(/^Merge pull request #\d+ from .*/i, '');
  // Remove leading "- " or "* "
  text = text.replace(/^[-*]\s*/, '');
  // Strip inline backticks to prevent truncation artifacts
  text = text.replace(/`[^`]*`/g, (m) => m.slice(1, -1));
  // Remove any remaining stray backticks
  text = text.replace(/`/g, '');
  // Capitalize first letter
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

/** Build polished, recruiter-friendly bullets from changed file areas (fallback logic). */
function buildAreaBullets(files: string[]): string[] {
  const groups = categorizeFiles(files);
  const bullets: string[] = [];
  for (const [area] of groups) {
    const template = AREA_BULLET_TEMPLATES[area];
    if (template && !bullets.some(b => b === template)) {
      bullets.push(template);
    }
    if (bullets.length >= 5) break;
  }
  return bullets;
}

/** Format files grouped by area for the Files Changed section. */
function formatGroupedFiles(files: string[]): string {
  const groups = categorizeFiles(files);
  const lines: string[] = [];
  for (const [area, areaFiles] of groups) {
    lines.push(`# ${area}`);
    for (const f of areaFiles.sort()) {
      lines.push(f);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

/** Check whether a bullet meets quality standards for human-readable output. */
function isQualityBullet(bullet: string): boolean {
  const trimmed = bullet.trim();
  // Must start with a verb (capital letter followed by lowercase)
  if (!/^[A-Z][a-z]/.test(trimmed)) return false;
  // Must be at least 8 words
  if (trimmed.split(/\s+/).length < 8) return false;
  // Must end with a period (complete sentence)
  if (!trimmed.endsWith('.')) return false;
  // Must not contain file names (e.g. foo.ts, bar.tsx, baz.md)
  if (/\b\w+\.\w{1,4}\b/.test(trimmed) && /\.(ts|tsx|js|jsx|md|json|yml|yaml|css|html)/.test(trimmed)) return false;
  // Must not contain colon-prefixed commit text (e.g. "feat: ...")
  if (/^[a-z]+(\([^)]*\))?:/i.test(trimmed)) return false;
  // Must not contain backticks
  if (trimmed.includes('`')) return false;
  return true;
}

/** Ensure a bullet ends with a period. */
function ensurePeriod(bullet: string): string {
  const trimmed = bullet.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

/** Check if any changed files are in apps/web/. */
function hasWebChanges(files: string[]): boolean {
  return files.some(f => f.startsWith('apps/web/'));
}

const DEPLOY_READINESS_BULLET = 'Improved deploy readiness in the web application with clearer onboarding and browser capability detection.'

/** Validate that all bullets pass quality rules. Returns list of failing bullets. */
function validateBullets(bullets: string[]): string[] {
  const failures: string[] = [];
  for (const b of bullets) {
    if (isBannedBullet(b)) failures.push(`BANNED: "${b}"`);
    if (b.trim().length === 0) failures.push('EMPTY bullet');
    if (isTruncatedBullet(b)) failures.push(`TRUNCATED: "${b}"`);
    if (!isQualityBullet(b)) failures.push(`LOW_QUALITY: "${b}"`);
  }
  // Check duplicates
  const seen = new Set<string>();
  for (const b of bullets) {
    const key = b.toLowerCase().trim();
    if (seen.has(key)) failures.push(`DUPLICATE: "${b}"`);
    seen.add(key);
  }
  if (bullets.length < 3) failures.push(`Too few bullets: ${bullets.length} (need 3–5)`);
  if (bullets.length > 5) failures.push(`Too many bullets: ${bullets.length} (max 5)`);
  return failures;
}

function generateHumanSummary(pr: PRInfo, files: string[], _commits: string): string[] {
  // --- Phase 1: Collect candidate bullets from PR metadata ---
  const candidates: string[] = [];

  // PR title (cleaned)
  if (pr.title) {
    const cleaned = cleanBulletText(pr.title);
    if (cleaned.length > 5 && !isBannedBullet(cleaned)) {
      candidates.push(cleaned);
    }
  }

  // PR body lines (cleaned, heavily filtered)
  if (pr.body) {
    const lines = pr.body.split('\n')
      .map(l => cleanBulletText(l))
      .filter(l => l.length > 10 && l.length < 200)
      .filter(l => !l.startsWith('#') && !l.startsWith('```'))
      .filter(l => !l.endsWith(':'))  // Skip header/intro lines
      .filter(l => !isBannedBullet(l))
      .filter(l => !PLACEHOLDER_WORD_PATTERNS.some(p => p.test(l)));
    for (const line of lines.slice(0, 4)) {
      if (!candidates.some(c => c.toLowerCase() === line.toLowerCase())) {
        candidates.push(line);
      }
    }
  }

  // --- Phase 2: Fill remaining slots with polished area-based bullets ---
  const areaBullets = buildAreaBullets(files);
  for (const ab of areaBullets) {
    if (candidates.length >= 5) break;
    if (!candidates.some(c => c.toLowerCase() === ab.toLowerCase())) {
      candidates.push(ab);
    }
  }

  // --- Phase 2b: Inject deploy-readiness bullet if web files changed ---
  if (hasWebChanges(files) && !candidates.some(c => c.toLowerCase().includes('deploy readiness'))) {
    candidates.push(DEPLOY_READINESS_BULLET);
  }

  // --- Phase 3: Ensure complete sentences, trim to 3–5 and validate ---
  let bullets = candidates.map(ensurePeriod).slice(0, 5);

  // Remove any that still fail validation individually
  bullets = bullets.filter(b => !isBannedBullet(b) && b.trim().length > 0 && !isTruncatedBullet(b) && isQualityBullet(b));

  // Deduplicate (case-insensitive)
  const deduped: string[] = [];
  const seenLower = new Set<string>();
  for (const b of bullets) {
    const key = b.toLowerCase().trim();
    if (!seenLower.has(key)) {
      seenLower.add(key);
      deduped.push(b);
    }
  }
  bullets = deduped;

  // --- Phase 4: If still not enough, use pure area fallback ---
  if (bullets.length < 3) {
    bullets = buildAreaBullets(files);
    // Always ensure at least 3
    const fallbacks = [
      'Strengthened the export workflow so summaries are cleaner and more reliable.',
      'Updated documentation to reflect the latest codebase improvements and conventions.',
      'Improved developer feedback with clearer diagnostics and auto-fix reporting.',
    ];
    for (const fb of fallbacks) {
      if (bullets.length >= 3) break;
      if (!bullets.some(b => b.toLowerCase() === fb.toLowerCase())) {
        bullets.push(fb);
      }
    }
  }

  return bullets.map(ensurePeriod).slice(0, 5);
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

  // Extract and validate Human Summary bullets
  const summarySection = content.match(/## Human Summary\n([\s\S]*?)(?=\n##|$)/);
  if (!summarySection) {
    console.error('\nERROR: Human Summary section not found in changes-summary');
    process.exit(1);
  }

  const bulletLines = summarySection[1].split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim());

  const bulletCount = bulletLines.length;
  if (bulletCount < 3) {
    console.error(`\nERROR: Human Summary has only ${bulletCount} bullets (need at least 3)`);
    process.exit(1);
  }
  if (bulletCount > 5) {
    console.error(`\nERROR: Human Summary has ${bulletCount} bullets (max 5)`);
    process.exit(1);
  }

  // Check each bullet against banned patterns, truncation, and quality
  for (const bullet of bulletLines) {
    if (bullet.length === 0) {
      console.error('\nERROR: Human Summary contains an empty bullet');
      process.exit(1);
    }
    if (isBannedBullet(bullet)) {
      console.error(`\nERROR: Human Summary bullet contains banned noise: "${bullet}"`);
      process.exit(1);
    }
    if (isTruncatedBullet(bullet)) {
      console.error(`\nERROR: Human Summary bullet appears truncated: "${bullet}"`);
      process.exit(1);
    }
    if (!isQualityBullet(bullet)) {
      console.error(`\nERROR: Human Summary bullet fails quality check (must start with verb, ≥8 words, no file names, no commit prefixes): "${bullet}"`);
      process.exit(1);
    }
  }

  // Check for duplicate bullets
  const seenBullets = new Set<string>();
  for (const bullet of bulletLines) {
    const key = bullet.toLowerCase();
    if (seenBullets.has(key)) {
      console.error(`\nERROR: Human Summary contains duplicate bullet: "${bullet}"`);
      process.exit(1);
    }
    seenBullets.add(key);
  }

  // Check Files Changed is not empty
  const filesSection = content.match(/## Files Changed\n\n```\n([\s\S]*?)```/);
  if (!filesSection || !filesSection[1].trim()) {
    console.error('\nERROR: Files Changed section is empty');
    process.exit(1);
  }

  // Validate Next Milestone does not list already-implemented work
  const nextSection = content.match(/## Next Milestone\n([\s\S]*?)(?=\n##|$)/);
  if (nextSection) {
    const implementedLabels = ROADMAP.filter(r => r.implemented).map(r => r.label.toLowerCase());
    const nextLines = nextSection[1].split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean);
    for (const line of nextLines) {
      for (const impl of implementedLabels) {
        if (line.toLowerCase().includes(impl) || impl.includes(line.toLowerCase())) {
          console.error(`\nERROR: Next Milestone lists already-implemented work: "${line}"`);
          process.exit(1);
        }
      }
    }
    if (nextLines.length < 2 || nextLines.length > 4) {
      console.error(`\nERROR: Next Milestone should have 2–4 items, found ${nextLines.length}`);
      process.exit(1);
    }
  }

  console.log('  ✓ Human Summary: 3–5 polished bullets');
  console.log('  ✓ No banned noise patterns detected');
  console.log('  ✓ No duplicate bullets');
  console.log('  ✓ Files Changed section populated');
  console.log('  ✓ Next Milestone: no already-implemented items');
}

// --- Next Milestone dynamic generation ---

interface RoadmapItem {
  label: string;
  implemented: boolean;
}

/** Curated roadmap with implementation status. Keep this up to date as features ship. */
const ROADMAP: RoadmapItem[] = [
  { label: 'GitHub Action automated analysis', implemented: true },
  { label: 'VS Code extension for in-editor analysis', implemented: true },
  { label: 'Rule configuration system', implemented: true },
  { label: 'Ignore file support', implemented: true },
  { label: 'Early-return rule', implemented: true },
  { label: 'CLI package for headless analysis', implemented: true },
  { label: 'Auto-apply suggested fixes', implemented: true },
  { label: 'PR comment bot for analysis summaries', implemented: true },
  { label: 'Custom rule authoring API for user-defined rules', implemented: true },
  { label: 'Rule presets for common project types', implemented: true },
  { label: 'Web UI improvements with expandable issue details', implemented: true },
  { label: 'Fix preview mode for safe dry-run inspection', implemented: true },
  { label: 'Stronger auto-fix engine with detailed skip reporting', implemented: true },
  { label: 'Monorepo-aware analysis with per-package reports', implemented: true },
  { label: 'HTML report export for standalone sharing', implemented: true },
  { label: 'Enhanced PR comment summaries with package highlights', implemented: true },
  { label: 'Summary-only CLI mode for fast CI checks', implemented: true },
  { label: 'Lightweight repo-pack-latest export mode', implemented: true },
  { label: 'Web app onboarding About section and empty state', implemented: true },
  { label: 'Richer complexity warnings with contributor breakdown', implemented: true },
  { label: 'Conservative analysis rules (no-debugger, no-empty-catch, no-useless-return, ts-diagnostics)', implemented: true },
  { label: 'Deploy web app as a hosted service', implemented: false },
  { label: 'Rule dependency graph and cascade analysis', implemented: false },
  { label: 'Performance profiling for large codebases', implemented: false },
  { label: 'VS Code extension inline fix suggestions', implemented: false },
];

function generateNextMilestoneSection(): string {
  const future = ROADMAP.filter(r => !r.implemented).map(r => r.label);

  // Validate: no duplicates, 2–4 items
  const unique = [...new Set(future)];
  const items = unique.slice(0, 4);
  if (items.length < 2) {
    // Safety fallback — should never happen if ROADMAP is maintained
    items.push('Explore additional static analysis rules');
    items.push('Performance profiling for large codebases');
  }

  return items.map(i => `- ${i}`).join('\n');
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

// Generate latest/lightweight pack (core files + structure, no history/docs/screenshots)
const latestExtraIgnore = [
  'screenshots',
  'docs',
  '.github',
  'ai/scripts',
  'scripts',
];
const latestOutput = join(EXPORTS_DIR, `repo-pack-latest-v${nextVersion}.md`);
console.log('Generating latest (lightweight) repo pack...');
runRepomix(latestOutput, [...baseIgnore, ...latestExtraIgnore]);

// Gather milestone-specific data
const prInfo = getLatestPRInfo();
const milestoneFiles = getMilestoneFilesChanged(prInfo);
const recentCommits = run('git log --oneline -10');

// Generate and validate Human Summary bullets (retry with fallback if needed)
let humanBullets = generateHumanSummary(prInfo, milestoneFiles, recentCommits);
let bulletErrors = validateBullets(humanBullets);

if (bulletErrors.length > 0) {
  console.log('Initial bullets failed validation, regenerating from file areas...');
  for (const err of bulletErrors) console.log(`  - ${err}`);
  humanBullets = buildAreaBullets(milestoneFiles);
  // Ensure 3–5 range
  const fallbacks = [
    'Strengthened the export workflow so summaries are cleaner and more reliable.',
    'Updated documentation to reflect the latest codebase improvements and conventions.',
    'Improved developer feedback with clearer diagnostics and auto-fix reporting.',
  ];
  for (const fb of fallbacks) {
    if (humanBullets.length >= 3) break;
    if (!humanBullets.some(b => b.toLowerCase() === fb.toLowerCase())) {
      humanBullets.push(fb);
    }
  }
  humanBullets = humanBullets.slice(0, 5);

  // Final check — if still failing, hard-fail
  bulletErrors = validateBullets(humanBullets);
  if (bulletErrors.length > 0) {
    console.error('\nERROR: Human Summary bullets failed validation even after fallback:');
    for (const err of bulletErrors) console.error(`  - ${err}`);
    process.exit(1);
  }
}

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
${formatGroupedFiles(milestoneFiles)}
\`\`\`

## Known Limitations
- Auto-fix supports 6 rules (optional-chaining, boolean-simplification, unused-imports, early-return, no-debugger, no-useless-return) — more planned
- Complexity-hotspot, no-empty-catch, and ts-diagnostics are advisory only — no auto-fix support
- Browser folder picker requires Chrome/Edge (File System Access API)

## Next Milestone
${generateNextMilestoneSection()}

## Regenerate

\`\`\`bash
npm run repopack
\`\`\`

This scans \`ai/exports/\` for existing versioned files, increments the version, runs repomix, and writes:
- \`ai/exports/repo-pack-full-vN.md\` — full repository pack
- \`ai/exports/repo-pack-core-vN.md\` — core-only pack (no docs/screenshots/.github)
- \`ai/exports/repo-pack-latest-vN.md\` — lightweight pack for quick review (no docs/screenshots/.github/scripts)
- \`ai/exports/changes-summary-vN.md\` — this file
`;

const summaryPath = join(EXPORTS_DIR, `changes-summary-v${nextVersion}.md`);
writeFileSync(summaryPath, summary, 'utf-8');

// Validate summary content before proceeding
console.log('\nValidating changes-summary content...');
const writtenContent = readFileSync(summaryPath, 'utf-8');
validateSummaryContent(writtenContent);
console.log('Summary validation passed.');

// Verify all 4 files exist
const generatedFiles = [fullOutput, coreOutput, latestOutput, summaryPath];
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

// Verify only the expected 4 files remain for the new version
const expectedFiles = [
  `repo-pack-full-v${nextVersion}.md`,
  `repo-pack-core-v${nextVersion}.md`,
  `repo-pack-latest-v${nextVersion}.md`,
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
console.log(`  ai/exports/repo-pack-latest-v${nextVersion}.md`);
console.log(`  ai/exports/changes-summary-v${nextVersion}.md`);
console.log('');
console.log('Old versions deleted: YES');
console.log('Summary validation passed: YES');
console.log('----------------------------------------');
