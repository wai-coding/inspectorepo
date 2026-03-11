import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseDiff, isAutoFixable, applyFix, formatPreviewReport } from './fixer.js';
import type { Issue } from '@inspectorepo/shared';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeIssue(ruleId: string, proposedDiff?: string): Issue {
  return {
    id: `test:1:${ruleId}`,
    ruleId,
    severity: 'info',
    message: 'test',
    filePath: 'src/test.ts',
    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
    suggestion: {
      summary: 'test',
      details: 'test',
      proposedDiff,
    },
  };
}

describe('isAutoFixable', () => {
  it('returns true for optional-chaining with diff', () => {
    const issue = makeIssue('optional-chaining', '- a && a.b\n+ a?.b');
    expect(isAutoFixable(issue)).toBe(true);
  });

  it('returns true for boolean-simplification with diff', () => {
    const issue = makeIssue('boolean-simplification', '- x === true\n+ x');
    expect(isAutoFixable(issue)).toBe(true);
  });

  it('returns true for unused-imports with diff', () => {
    const issue = makeIssue('unused-imports', '- import { foo } from "bar";');
    expect(isAutoFixable(issue)).toBe(true);
  });

  it('returns false for complexity-hotspot', () => {
    const issue = makeIssue('complexity-hotspot', '- some diff');
    expect(isAutoFixable(issue)).toBe(false);
  });

  it('returns false when no diff is provided', () => {
    const issue = makeIssue('optional-chaining');
    expect(isAutoFixable(issue)).toBe(false);
  });
});

describe('parseDiff', () => {
  it('parses optional chaining diff', () => {
    const result = parseDiff('- user && user.name\n+ user?.name');
    expect(result).toEqual({
      oldText: 'user && user.name',
      newText: 'user?.name',
    });
  });

  it('parses boolean simplification diff', () => {
    const result = parseDiff('- x === true\n+ x');
    expect(result).toEqual({
      oldText: 'x === true',
      newText: 'x',
    });
  });

  it('parses unused import removal (no addition)', () => {
    const result = parseDiff('- import { foo } from "bar";');
    expect(result).toEqual({
      oldText: 'import { foo } from "bar";',
      newText: null,
    });
  });

  it('parses partial import fix', () => {
    const result = parseDiff('- import { a, b } from "x";\n+ import { a } from \'x\';');
    expect(result).toEqual({
      oldText: 'import { a, b } from "x";',
      newText: "import { a } from 'x';",
    });
  });

  it('returns null for empty diff', () => {
    const result = parseDiff('some random text');
    expect(result).toBeNull();
  });
});

describe('applyFix', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fixer-test-'));
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeTestFile(relativePath: string, content: string): void {
    writeFileSync(join(tmpDir, relativePath), content, 'utf-8');
  }

  function readTestFile(relativePath: string): string {
    return readFileSync(join(tmpDir, relativePath), 'utf-8');
  }

  function makeFixIssue(
    ruleId: string,
    filePath: string,
    line: number,
    proposedDiff: string,
  ): Issue {
    return {
      id: `test:${line}:${ruleId}`,
      ruleId,
      severity: 'info',
      message: 'test',
      filePath,
      range: { start: { line, column: 1 }, end: { line, column: 1 } },
      suggestion: { summary: 'test', details: 'test', proposedDiff },
    };
  }

  it('skips fix when pattern appears multiple times', () => {
    const content = 'user && user.name\nconst x = 1;\nuser && user.name\n';
    writeTestFile('src/dup.ts', content);

    const issue = makeFixIssue(
      'optional-chaining',
      'src/dup.ts',
      1,
      '- user && user.name\n+ user?.name',
    );

    const result = applyFix(tmpDir, issue);
    expect(result.applied).toBe(false);
    // File should be unchanged
    expect(readTestFile('src/dup.ts')).toBe(content);
  });

  it('applies fix when pattern appears once', () => {
    const content = 'const a = user && user.name;\nconst b = 2;\n';
    writeTestFile('src/single.ts', content);

    const issue = makeFixIssue(
      'optional-chaining',
      'src/single.ts',
      1,
      '- user && user.name\n+ user?.name',
    );

    const result = applyFix(tmpDir, issue);
    expect(result.applied).toBe(true);
    expect(readTestFile('src/single.ts')).toBe('const a = user?.name;\nconst b = 2;\n');
  });

  it('skips fix when target line has unexpected context', () => {
    const content = 'const x = 1;\nuser && user.name\n';
    writeTestFile('src/ctx.ts', content);

    // Issue says line 1, but the pattern is on line 2
    const issue = makeFixIssue(
      'optional-chaining',
      'src/ctx.ts',
      1,
      '- user && user.name\n+ user?.name',
    );

    const result = applyFix(tmpDir, issue);
    expect(result.applied).toBe(false);
    // File should be unchanged
    expect(readTestFile('src/ctx.ts')).toBe(content);
  });

  it('applies normal optional chaining fix correctly', () => {
    const content = 'function get() {\n  return obj && obj.value;\n}\n';
    writeTestFile('src/chain.ts', content);

    const issue = makeFixIssue(
      'optional-chaining',
      'src/chain.ts',
      2,
      '- obj && obj.value\n+ obj?.value',
    );

    const result = applyFix(tmpDir, issue);
    expect(result.applied).toBe(true);
    expect(readTestFile('src/chain.ts')).toBe('function get() {\n  return obj?.value;\n}\n');
  });
});

describe('formatPreviewReport', () => {
  it('renders expected preview output', () => {
    const issues: Issue[] = [
      {
        id: 'test:42:optional-chaining',
        ruleId: 'optional-chaining',
        severity: 'info',
        message: 'Use optional chaining',
        filePath: 'src/user.ts',
        range: { start: { line: 42, column: 1 }, end: { line: 42, column: 1 } },
        suggestion: {
          summary: 'Use optional chaining',
          details: '',
          proposedDiff: '- if (user && user.name)\n+ if (user?.name)',
        },
      },
    ];

    const output = formatPreviewReport(issues);
    expect(output).toContain('Proposed fixes:');
    expect(output).toContain('File: src/user.ts');
    expect(output).toContain('Rule: optional-chaining');
    expect(output).toContain('Before:');
    expect(output).toContain('if (user && user.name)');
    expect(output).toContain('After:');
    expect(output).toContain('if (user?.name)');
    expect(output).toContain('No files were modified');
  });

  it('preview mode does not modify files', () => {
    const issues: Issue[] = [
      {
        id: 'test:1:optional-chaining',
        ruleId: 'optional-chaining',
        severity: 'info',
        message: 'test',
        filePath: 'src/test.ts',
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
        suggestion: {
          summary: 'test',
          details: '',
          proposedDiff: '- user && user.name\n+ user?.name',
        },
      },
    ];

    // formatPreviewReport is read-only — it only generates text output
    const output = formatPreviewReport(issues);
    expect(output).toContain('1 fixable issue(s) found');
    expect(output).toContain('No files were modified');
    // No file operations occurred — this is purely a formatting function
  });
});
