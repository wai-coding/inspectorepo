import { describe, it, expect } from 'vitest';
import { parseDiff, isAutoFixable } from './fixer.js';
import type { Issue } from '@inspectorepo/shared';

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
