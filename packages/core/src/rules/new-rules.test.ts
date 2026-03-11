import { describe, it, expect } from 'vitest';
import { analyzeCodebase } from '../analyzer.js';
import { noDebuggerRule } from './no-debugger.js';
import { noEmptyCatchRule } from './no-empty-catch.js';
import { noUselessReturnRule } from './no-useless-return.js';

function analyze(code: string, rules: NonNullable<Parameters<typeof analyzeCodebase>[0]['options']>['rules']) {
  return analyzeCodebase({
    files: [{ path: 'src/test.ts', content: code }],
    selectedDirectories: ['src'],
    options: { rules },
  });
}

describe('no-debugger rule', () => {
  it('detects debugger statement', () => {
    const code = [
      'function foo() {',
      '  debugger;',
      '  return 1;',
      '}',
    ].join('\n');

    const report = analyze(code, [noDebuggerRule]);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('no-debugger');
    expect(report.issues[0].message).toContain('Debugger');
    expect(report.issues[0].suggestion.proposedDiff).toContain('- debugger;');
  });

  it('does not flag code without debugger', () => {
    const code = 'function foo() { return 1; }';
    const report = analyze(code, [noDebuggerRule]);
    expect(report.issues.length).toBe(0);
  });

  it('detects multiple debugger statements', () => {
    const code = [
      'function a() { debugger; }',
      'function b() { debugger; }',
    ].join('\n');

    const report = analyze(code, [noDebuggerRule]);
    expect(report.issues.length).toBe(2);
  });
});

describe('no-empty-catch rule', () => {
  it('detects empty catch block', () => {
    const code = [
      'try {',
      '  doSomething();',
      '} catch (e) {',
      '}',
    ].join('\n');

    const report = analyze(code, [noEmptyCatchRule]);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('no-empty-catch');
    expect(report.issues[0].message).toContain('Empty catch');
  });

  it('does not flag non-empty catch', () => {
    const code = [
      'try {',
      '  doSomething();',
      '} catch (e) {',
      '  console.error(e);',
      '}',
    ].join('\n');

    const report = analyze(code, [noEmptyCatchRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag catch with rethrow', () => {
    const code = [
      'try {',
      '  doSomething();',
      '} catch (e) {',
      '  throw e;',
      '}',
    ].join('\n');

    const report = analyze(code, [noEmptyCatchRule]);
    expect(report.issues.length).toBe(0);
  });
});

describe('no-useless-return rule', () => {
  it('detects redundant final return', () => {
    const code = [
      'function foo() {',
      '  console.log("hello");',
      '  return;',
      '}',
    ].join('\n');

    const report = analyze(code, [noUselessReturnRule]);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('no-useless-return');
    expect(report.issues[0].message).toContain('Redundant return');
    expect(report.issues[0].suggestion.proposedDiff).toContain('- return;');
  });

  it('does not flag return with value', () => {
    const code = [
      'function foo() {',
      '  return 42;',
      '}',
    ].join('\n');

    const report = analyze(code, [noUselessReturnRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag meaningful early return', () => {
    const code = [
      'function foo(x: boolean) {',
      '  if (x) return;',
      '  console.log("no x");',
      '}',
    ].join('\n');

    const report = analyze(code, [noUselessReturnRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag arrow function expression body', () => {
    const code = 'const fn = () => 42;';
    const report = analyze(code, [noUselessReturnRule]);
    expect(report.issues.length).toBe(0);
  });
});
