import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind } from 'ts-morph';

const CONSOLE_METHODS = new Set(['log', 'warn', 'error', 'info', 'debug']);

export const noConsoleRule: Rule = {
  id: 'no-console',
  title: 'No Console',
  severity: 'warn',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;

      const expr = node.getChildren()[0];
      if (!expr || expr.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const children = expr.getChildren();
      if (children.length < 3) return;

      const obj = children[0];
      const method = children[2];
      if (obj.getText() !== 'console') return;

      const methodName = method.getText();
      if (!CONSOLE_METHODS.has(methodName)) return;

      const line = node.getStartLineNumber();
      const lineText = node.getText();

      issues.push({
        id: `${ctx.filePath}:${line}:no-console`,
        ruleId: 'no-console',
        severity: 'warn',
        message: `console.${methodName}() call found at line ${line}.`,
        filePath: ctx.filePath,
        range: {
          start: { line, column: 1 },
          end: { line: node.getEndLineNumber(), column: 1 },
        },
        suggestion: {
          summary: 'Remove or replace console usage before shipping.',
          details: `Console statements should be removed from production code. Found: ${lineText}`,
        },
      });
    });

    return issues;
  },
};
