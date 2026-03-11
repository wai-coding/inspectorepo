/**
 * Example custom rule: no-console
 *
 * Detects `console.log`, `console.warn`, `console.error`, etc.
 * Demonstrates how to use defineRule() to create custom InspectoRepo rules.
 *
 * Usage:
 *   import { analyzeCodebase, defineRule } from '@inspectorepo/core';
 *
 *   const noConsoleRule = defineRule({
 *     id: 'no-console',
 *     title: 'No Console',
 *     severity: 'warn',
 *     run(ctx) {
 *       // ... (see implementation below)
 *     },
 *   });
 *
 *   const report = analyzeCodebase({
 *     files,
 *     selectedDirectories: ['src'],
 *     options: { customRules: [noConsoleRule] },
 *   });
 */

import { defineRule } from '@inspectorepo/core';
import type { Issue } from '@inspectorepo/shared';
import { SyntaxKind } from 'ts-morph';

export const noConsoleRule = defineRule({
  id: 'no-console',
  title: 'No Console',
  severity: 'warn',
  run(ctx) {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
      const expr = call.getExpression();
      const text = expr.getText();

      if (/^console\.\w+$/.test(text)) {
        const start = call.getStartLineNumber();
        const startCol = call.getStart() - sourceFile.getFullText().lastIndexOf('\n', call.getStart()) - 1;

        issues.push({
          id: `${ctx.filePath}:${start}:no-console`,
          ruleId: 'no-console',
          severity: 'warn',
          message: `Unexpected ${text} statement`,
          filePath: ctx.filePath,
          range: {
            start: { line: start, column: Math.max(1, startCol) },
            end: { line: start, column: Math.max(1, startCol) + text.length },
          },
          suggestion: {
            summary: `Remove or replace ${text} with a proper logging utility`,
            details: 'Console statements should not be committed to production code.',
          },
        });
      }
    });

    return issues;
  },
});
