import { describe, it, expect } from 'vitest';
import { analyzeCodebase } from '../analyzer.js';
import { earlyReturnRule } from './early-return.js';

function analyze(code: string) {
  return analyzeCodebase({
    files: [{ path: 'src/test.ts', content: code }],
    selectedDirectories: ['src'],
    options: { rules: [earlyReturnRule] },
  });
}

describe('early-return rule', () => {
  it('detects simple early return in a block', () => {
    const code = [
      'function foo(user: any) {',
      '  if (!user) {',
      '    return;',
      '  }',
      '  console.log(user);',
      '}',
    ].join('\n');

    const report = analyze(code);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('early-return');
    expect(report.issues[0].message).toContain('if (!user) return;');
    expect(report.issues[0].suggestion.proposedDiff).toContain('+ if (!user) return;');
  });

  it('does not trigger when block has extra statements', () => {
    const code = [
      'function foo(user: any) {',
      '  if (!user) {',
      '    console.log("missing");',
      '    return;',
      '  }',
      '}',
    ].join('\n');

    const report = analyze(code);
    expect(report.issues.length).toBe(0);
  });

  it('does not auto-fix when block has a comment', () => {
    const code = [
      'function foo(user: any) {',
      '  if (!user) {',
      '    // bail out early',
      '    return;',
      '  }',
      '}',
    ].join('\n');

    const report = analyze(code);
    expect(report.issues.length).toBe(0);
  });

  it('does not trigger when return has an argument', () => {
    const code = [
      'function foo(x: number) {',
      '  if (x < 0) {',
      '    return -1;',
      '  }',
      '}',
    ].join('\n');

    const report = analyze(code);
    expect(report.issues.length).toBe(0);
  });

  it('does not trigger when there is an else branch', () => {
    const code = [
      'function foo(x: boolean) {',
      '  if (!x) {',
      '    return;',
      '  } else {',
      '    console.log("yes");',
      '  }',
      '}',
    ].join('\n');

    const report = analyze(code);
    expect(report.issues.length).toBe(0);
  });
});
