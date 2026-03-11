import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Issue } from '@inspectorepo/shared';

/** Rules that are safe to auto-fix. */
const SAFE_RULE_IDS = new Set([
  'optional-chaining',
  'boolean-simplification',
  'unused-imports',
  'early-return',
  'no-debugger',
  'no-useless-return',
]);

export function isAutoFixable(issue: Issue): boolean {
  return SAFE_RULE_IDS.has(issue.ruleId) && !!issue.suggestion.proposedDiff;
}

export type SkipReason =
  | 'no-diff'
  | 'parse-failed'
  | 'file-read-error'
  | 'no-occurrences'
  | 'duplicate-pattern'
  | 'unexpected-context'
  | 'index-mismatch';

export interface FixResult {
  filePath: string;
  ruleId: string;
  line: number;
  applied: boolean;
  skipped: boolean;
  skipReason?: SkipReason;
}

export interface FixPlan {
  fixable: Issue[];
  results: FixResult[];
  summary: FixSummary;
}

export interface FixSummary {
  total: number;
  applied: number;
  skipped: number;
  byRule: Record<string, { applied: number; skipped: number }>;
}

/**
 * Parse a proposedDiff into removals and additions.
 * Expected format:
 *   - <old line text>
 *   + <new line text>
 * A removal-only diff (e.g. unused import removal) has no + line.
 */
export function parseDiff(diff: string): { oldText: string; newText: string | null } | null {
  const lines = diff.split('\n');
  const removals: string[] = [];
  const additions: string[] = [];

  for (const line of lines) {
    if (line.startsWith('- ')) {
      removals.push(line.slice(2));
    } else if (line.startsWith('+ ')) {
      additions.push(line.slice(2));
    }
  }

  if (removals.length === 0) return null;

  return {
    oldText: removals.join('\n'),
    newText: additions.length > 0 ? additions.join('\n') : null,
  };
}

/**
 * Apply a single fix to a file using line-based replacement.
 * Locates the target line by the issue's line number, confirms it matches
 * the expected pattern, and replaces only that line. Skips the fix if
 * the expected text cannot be uniquely located.
 */
export function applyFix(rootDir: string, issue: Issue): FixResult {
  const result: FixResult = {
    filePath: issue.filePath,
    ruleId: issue.ruleId,
    line: issue.range.start.line,
    applied: false,
    skipped: true,
  };

  const diff = issue.suggestion.proposedDiff;
  if (!diff) { result.skipReason = 'no-diff'; return result; }

  const parsed = parseDiff(diff);
  if (!parsed) { result.skipReason = 'parse-failed'; return result; }

  const fullPath = join(rootDir, issue.filePath);
  let content: string;
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch {
    result.skipReason = 'file-read-error';
    return result;
  }

  const { oldText, newText } = parsed;
  const fileLines = content.split('\n');

  // Guard: check how many times the old text appears in the file
  const occurrences = countOccurrences(content, oldText);
  if (occurrences === 0) { result.skipReason = 'no-occurrences'; return result; }
  if (occurrences > 1) {
    console.warn(`  ⚠ Skipped: pattern appears ${occurrences} times in file (expected 1)`);
    result.skipReason = 'duplicate-pattern';
    return result;
  }

  // Line-based replacement: locate using the issue's reported line number
  const targetLineIdx = issue.range.start.line - 1; // 0-based
  if (targetLineIdx < 0 || targetLineIdx >= fileLines.length) return result;

  const oldLines = oldText.split('\n');
  // Verify that the file content at the target line matches the expected pattern
  const matchesAtTarget = oldLines.every((expected, i) => {
    const fileLineIdx = targetLineIdx + i;
    if (fileLineIdx >= fileLines.length) return false;
    return fileLines[fileLineIdx].includes(expected.trim());
  });

  if (!matchesAtTarget) {
    console.warn('  ⚠ Skipped: unexpected context at target line');
    result.skipReason = 'unexpected-context';
    return result;
  }

  // Apply replacement using indexOf on confirmed single occurrence
  const idx = content.indexOf(oldText);
  if (idx === -1) { result.skipReason = 'index-mismatch'; return result; }

  if (newText !== null) {
    content = content.slice(0, idx) + newText + content.slice(idx + oldText.length);
  } else {
    // Remove the line entirely (unused import removal)
    const before = content.slice(0, idx);
    const after = content.slice(idx + oldText.length);
    const trimmedAfter = after.startsWith('\n') ? after.slice(1) : after;
    content = before + trimmedAfter;
  }

  writeFileSync(fullPath, content, 'utf-8');
  result.applied = true;
  result.skipped = false;
  return result;
}

/** Count non-overlapping occurrences of a substring in text. */
function countOccurrences(text: string, search: string): number {
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = text.indexOf(search, pos);
    if (idx === -1) break;
    count++;
    pos = idx + search.length;
  }
  return count;
}

/** Format a fix preview for terminal display. */
export function formatFixPreview(issue: Issue): string {
  const lines: string[] = [];
  const diff = issue.suggestion.proposedDiff ?? '';
  const parsed = parseDiff(diff);

  lines.push(`Rule: ${issue.ruleId}`);
  lines.push('');
  lines.push(`File: ${issue.filePath}`);
  lines.push(`Line: ${issue.range.start.line}`);
  lines.push('');

  if (parsed) {
    lines.push('Before:');
    lines.push(parsed.oldText);
    lines.push('');
    lines.push('After:');
    lines.push(parsed.newText ?? '(remove)');
    lines.push('');
  }

  lines.push('Suggested diff:');
  for (const line of diff.split('\n')) {
    lines.push(`  ${line}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Format all fixable issues as a preview-only report (no files modified). */
export function formatPreviewReport(issues: Issue[]): string {
  const lines: string[] = [];
  lines.push('Proposed fixes:\n');

  for (const issue of issues) {
    const diff = issue.suggestion.proposedDiff ?? '';
    const parsed = parseDiff(diff);

    lines.push(`File: ${issue.filePath}`);
    lines.push(`Rule: ${issue.ruleId}`);
    lines.push('');

    if (parsed) {
      lines.push('  Before:');
      for (const l of parsed.oldText.split('\n')) {
        lines.push(`  ${l}`);
      }
      lines.push('');
      lines.push('  After:');
      const afterText = parsed.newText ?? '(remove)';
      for (const l of afterText.split('\n')) {
        lines.push(`  ${l}`);
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push(`${issues.length} fixable issue(s) found. No files were modified.`);
  return lines.join('\n');
}

/** Build a fix plan from analysis issues. Shared by preview and apply modes. */
export function buildFixPlan(issues: Issue[]): FixPlan {
  const fixable = issues.filter(isAutoFixable);
  return {
    fixable,
    results: [],
    summary: { total: fixable.length, applied: 0, skipped: 0, byRule: {} },
  };
}

/** Compute summary from completed results. */
export function computeFixSummary(results: FixResult[]): FixSummary {
  const summary: FixSummary = {
    total: results.length,
    applied: 0,
    skipped: 0,
    byRule: {},
  };

  for (const r of results) {
    if (!summary.byRule[r.ruleId]) {
      summary.byRule[r.ruleId] = { applied: 0, skipped: 0 };
    }
    if (r.applied) {
      summary.applied++;
      summary.byRule[r.ruleId].applied++;
    } else {
      summary.skipped++;
      summary.byRule[r.ruleId].skipped++;
    }
  }

  return summary;
}

/** Human-readable skip reason. */
export function formatSkipReason(reason: SkipReason | undefined): string {
  switch (reason) {
    case 'no-diff': return 'no proposed diff available';
    case 'parse-failed': return 'could not parse the diff';
    case 'file-read-error': return 'could not read the file';
    case 'no-occurrences': return 'target pattern not found in file';
    case 'duplicate-pattern': return 'pattern appears multiple times (ambiguous)';
    case 'unexpected-context': return 'target line content does not match expected pattern';
    case 'index-mismatch': return 'internal index mismatch';
    default: return 'unknown reason';
  }
}

/** Format a final summary for terminal display. */
export function formatFixSummary(summary: FixSummary, mode: 'applied' | 'preview'): string {
  const lines: string[] = [];
  lines.push('');
  if (mode === 'preview') {
    lines.push(`Fix summary (preview — no files modified):`);
  } else {
    lines.push('Fix summary:');
  }
  lines.push(`  Total fixable: ${summary.total}`);
  if (mode === 'applied') {
    lines.push(`  Applied:       ${summary.applied}`);
  }
  lines.push(`  Skipped:       ${summary.skipped}`);

  const ruleIds = Object.keys(summary.byRule).sort();
  if (ruleIds.length > 0) {
    lines.push('');
    lines.push('  By rule:');
    for (const id of ruleIds) {
      const s = summary.byRule[id];
      if (mode === 'applied') {
        lines.push(`    ${id}: ${s.applied} applied, ${s.skipped} skipped`);
      } else {
        lines.push(`    ${id}: ${s.applied + s.skipped} issue(s)`);
      }
    }
  }

  return lines.join('\n');
}
