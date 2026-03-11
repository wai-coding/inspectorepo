import { describe, it, expect } from 'vitest';
import { analyzeCodebase } from '../analyzer.js';
import { noConsoleRule } from './no-console.js';
import { noEmptyFunctionRule } from './no-empty-function.js';
import { duplicateImportsRule } from './duplicate-imports.js';
import { noUnreachableAfterReturnRule } from './no-unreachable-after-return.js';
import { noThrowLiteralRule } from './no-throw-literal.js';

function analyze(code: string, rules: NonNullable<Parameters<typeof analyzeCodebase>[0]['options']>['rules']) {
  return analyzeCodebase({
    files: [{ path: 'src/test.ts', content: code }],
    selectedDirectories: ['src'],
    options: { rules },
  });
}

describe('no-console rule', () => {
  it('detects console.log', () => {
    const code = 'function foo() { console.log("hi"); }';
    const report = analyze(code, [noConsoleRule]);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('no-console');
    expect(report.issues[0].message).toContain('console.log');
  });

  it('detects console.warn and console.error', () => {
    const code = [
      'function a() { console.warn("w"); }',
      'function b() { console.error("e"); }',
    ].join('\n');
    const report = analyze(code, [noConsoleRule]);
    expect(report.issues.length).toBe(2);
  });

  it('does not flag non-console calls', () => {
    const code = 'function foo() { logger.log("hi"); }';
    const report = analyze(code, [noConsoleRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag console without method call', () => {
    const code = 'const c = console;';
    const report = analyze(code, [noConsoleRule]);
    expect(report.issues.length).toBe(0);
  });
});

describe('no-empty-function rule', () => {
  it('detects empty function declaration', () => {
    const code = 'function foo() {}';
    const report = analyze(code, [noEmptyFunctionRule]);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('no-empty-function');
  });

  it('detects empty arrow function', () => {
    const code = 'const fn = () => {};';
    const report = analyze(code, [noEmptyFunctionRule]);
    expect(report.issues.length).toBe(1);
  });

  it('does not flag function with body', () => {
    const code = 'function foo() { return 1; }';
    const report = analyze(code, [noEmptyFunctionRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag function with comment (intentional stub)', () => {
    const code = [
      'function foo() {',
      '  // intentionally empty',
      '}',
    ].join('\n');
    const report = analyze(code, [noEmptyFunctionRule]);
    expect(report.issues.length).toBe(0);
  });
});

describe('duplicate-imports rule', () => {
  it('detects duplicate imports from same module', () => {
    const code = [
      "import { a } from 'mod';",
      "import { b } from 'mod';",
    ].join('\n');
    const report = analyze(code, [duplicateImportsRule]);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('duplicate-imports');
    expect(report.issues[0].message).toContain('mod');
  });

  it('does not flag imports from different modules', () => {
    const code = [
      "import { a } from 'mod-a';",
      "import { b } from 'mod-b';",
    ].join('\n');
    const report = analyze(code, [duplicateImportsRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag single import', () => {
    const code = "import { a } from 'mod';";
    const report = analyze(code, [duplicateImportsRule]);
    expect(report.issues.length).toBe(0);
  });
});

describe('no-unreachable-after-return rule', () => {
  it('detects unreachable code after return', () => {
    const code = [
      'function foo() {',
      '  return 1;',
      '  const x = 2;',
      '}',
    ].join('\n');
    const report = analyze(code, [noUnreachableAfterReturnRule]);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('no-unreachable-after-return');
    expect(report.issues[0].message).toContain('Unreachable');
  });

  it('detects unreachable code after throw', () => {
    const code = [
      'function foo() {',
      '  throw new Error("fail");',
      '  console.log("never");',
      '}',
    ].join('\n');
    const report = analyze(code, [noUnreachableAfterReturnRule]);
    expect(report.issues.length).toBe(1);
  });

  it('does not flag reachable code', () => {
    const code = [
      'function foo(x: boolean) {',
      '  if (x) return 1;',
      '  return 2;',
      '}',
    ].join('\n');
    const report = analyze(code, [noUnreachableAfterReturnRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag type declarations after return', () => {
    const code = [
      'function foo() {',
      '  return 1;',
      '  type MyType = string;',
      '}',
    ].join('\n');
    const report = analyze(code, [noUnreachableAfterReturnRule]);
    expect(report.issues.length).toBe(0);
  });
});

describe('no-throw-literal rule', () => {
  it('detects throw string literal', () => {
    const code = 'function foo() { throw "error"; }';
    const report = analyze(code, [noThrowLiteralRule]);
    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('no-throw-literal');
    expect(report.issues[0].message).toContain('literal');
  });

  it('detects throw number literal', () => {
    const code = 'function foo() { throw 42; }';
    const report = analyze(code, [noThrowLiteralRule]);
    expect(report.issues.length).toBe(1);
  });

  it('does not flag throw new Error()', () => {
    const code = 'function foo() { throw new Error("fail"); }';
    const report = analyze(code, [noThrowLiteralRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag throw variable', () => {
    const code = [
      'function foo() {',
      '  const err = new Error("fail");',
      '  throw err;',
      '}',
    ].join('\n');
    const report = analyze(code, [noThrowLiteralRule]);
    expect(report.issues.length).toBe(0);
  });

  it('does not flag throw function call result', () => {
    const code = 'function foo() { throw createError(); }';
    const report = analyze(code, [noThrowLiteralRule]);
    expect(report.issues.length).toBe(0);
  });
});
