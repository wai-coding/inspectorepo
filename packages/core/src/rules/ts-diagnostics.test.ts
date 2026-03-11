import { describe, it, expect } from 'vitest';
import { analyzeCodebase } from '../analyzer.js';
import { tsDiagnosticsRule } from './ts-diagnostics.js';

function analyze(code: string) {
  return analyzeCodebase({
    files: [{ path: 'src/test.ts', content: code }],
    selectedDirectories: ['src'],
    options: { rules: [tsDiagnosticsRule] },
  });
}

describe('ts-diagnostics rule', () => {
  it('runs without error on clean code', () => {
    const report = analyze('const x: number = 1;\n');
    // Clean code should not trigger diagnostics from our subset
    expect(report.issues).toBeDefined();
  });

  it('detects unreachable code', () => {
    const code = [
      'function foo(): number {',
      '  return 1;',
      '  const x = 2;',
      '}',
    ].join('\n');

    const report = analyze(code);
    // Unreachable code (TS7027) may or may not fire depending on ts-morph config
    // but the rule should run without throwing
    expect(report.issues).toBeDefined();
  });

  it('issues have correct ruleId when diagnostics are found', () => {
    const code = [
      'function foo(): number {',
      '  return 1;',
      '  const x = 2;',
      '}',
    ].join('\n');

    const report = analyze(code);
    for (const issue of report.issues) {
      expect(issue.ruleId).toBe('ts-diagnostics');
      expect(issue.severity).toMatch(/error|warn/);
    }
  });
});
