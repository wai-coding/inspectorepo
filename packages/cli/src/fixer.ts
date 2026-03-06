import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Issue } from '@inspectorepo/shared';

/** Rules that are safe to auto-fix. */
const SAFE_RULE_IDS = new Set([
  'optional-chaining',
  'boolean-simplification',
  'unused-imports',
]);

export function isAutoFixable(issue: Issue): boolean {
  return SAFE_RULE_IDS.has(issue.ruleId) && !!issue.suggestion.proposedDiff;
}

export interface FixResult {
  filePath: string;
  ruleId: string;
  line: number;
  applied: boolean;
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
 * Apply a single fix to a file by replacing the old text with new text.
 * Uses line-based replacement for safety — only replaces the first occurrence.
 */
export function applyFix(rootDir: string, issue: Issue): FixResult {
  const result: FixResult = {
    filePath: issue.filePath,
    ruleId: issue.ruleId,
    line: issue.range.start.line,
    applied: false,
  };

  const diff = issue.suggestion.proposedDiff;
  if (!diff) return result;

  const parsed = parseDiff(diff);
  if (!parsed) return result;

  const fullPath = join(rootDir, issue.filePath);
  let content: string;
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch {
    return result;
  }

  const { oldText, newText } = parsed;

  // Find and replace the first occurrence of oldText
  const idx = content.indexOf(oldText);
  if (idx === -1) return result;

  if (newText !== null) {
    content = content.slice(0, idx) + newText + content.slice(idx + oldText.length);
  } else {
    // Remove the line entirely (unused import removal)
    // Find the full line(s) containing oldText and remove them
    const before = content.slice(0, idx);
    const after = content.slice(idx + oldText.length);
    // Remove any trailing newline from the deletion
    const trimmedAfter = after.startsWith('\n') ? after.slice(1) : after;
    content = before + trimmedAfter;
  }

  writeFileSync(fullPath, content, 'utf-8');
  result.applied = true;
  return result;
}

/** Format a fix preview for terminal display. */
export function formatFixPreview(issue: Issue): string {
  const lines: string[] = [];
  const diff = issue.suggestion.proposedDiff ?? '';
  const parsed = parseDiff(diff);

  lines.push(`${issue.ruleId} suggestion`);
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
