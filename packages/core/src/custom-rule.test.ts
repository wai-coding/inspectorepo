import { describe, it, expect } from 'vitest';
import { defineRule } from './custom-rule.js';
import { analyzeCodebase } from './analyzer.js';
import type { Issue } from '@inspectorepo/shared';
import { SyntaxKind } from 'ts-morph';

describe('defineRule', () => {
  it('returns a valid rule object', () => {
    const rule = defineRule({
      id: 'test-rule',
      title: 'Test Rule',
      severity: 'warn',
      run() { return []; },
    });

    expect(rule.id).toBe('test-rule');
    expect(rule.title).toBe('Test Rule');
    expect(rule.severity).toBe('warn');
    expect(typeof rule.run).toBe('function');
  });
});

describe('custom rules in analyzeCodebase', () => {
  const noConsoleRule = defineRule({
    id: 'no-console',
    title: 'No Console',
    severity: 'warn',
    run(ctx) {
      const issues: Issue[] = [];
      ctx.sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
        const text = call.getExpression().getText();
        if (/^console\.\w+$/.test(text)) {
          const line = call.getStartLineNumber();
          issues.push({
            id: `${ctx.filePath}:${line}:no-console`,
            ruleId: 'no-console',
            severity: 'warn',
            message: `Unexpected ${text} statement`,
            filePath: ctx.filePath,
            range: {
              start: { line, column: 1 },
              end: { line, column: 1 },
            },
            suggestion: {
              summary: `Remove or replace ${text}`,
              details: '',
            },
          });
        }
      });
      return issues;
    },
  });

  it('custom rules run during analysis', () => {
    const files = [
      { path: 'src/app.ts', content: 'console.log("hello");\n' },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [], customRules: [noConsoleRule] },
    });

    expect(report.issues.length).toBe(1);
    expect(report.issues[0].ruleId).toBe('no-console');
    expect(report.issues[0].message).toContain('console.log');
  });

  it('custom rules emit issues correctly', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: 'console.log("a");\nconsole.warn("b");\nconst x = 1;\n',
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { rules: [], customRules: [noConsoleRule] },
    });

    expect(report.issues.length).toBe(2);
    expect(report.issues[0].ruleId).toBe('no-console');
    expect(report.issues[1].ruleId).toBe('no-console');
  });

  it('combines built-in and custom rules', () => {
    const files = [
      {
        path: 'src/test.ts',
        content: 'import { foo } from "./foo";\nconsole.log("hello");\n',
      },
    ];
    const report = analyzeCodebase({
      files,
      selectedDirectories: ['src'],
      options: { customRules: [noConsoleRule] },
    });

    // Should have unused-imports from built-in + no-console from custom
    const ruleIds = report.issues.map(i => i.ruleId);
    expect(ruleIds).toContain('unused-imports');
    expect(ruleIds).toContain('no-console');
  });
});
