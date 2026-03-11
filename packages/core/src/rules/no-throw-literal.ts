import { SyntaxKind } from 'ts-morph';
import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';

export const noThrowLiteralRule: Rule = {
  id: 'no-throw-literal',
  title: 'No Throw Literal',
  severity: 'warn',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    for (const throwStmt of sourceFile.getDescendantsOfKind(SyntaxKind.ThrowStatement)) {
      const expression = throwStmt.getExpression();
      if (!expression) continue;

      const kind = expression.getKind();

      // Allow: throw new Error(), throw new SomeError(), throw variable, throw functionCall()
      if (kind === SyntaxKind.NewExpression) continue;
      if (kind === SyntaxKind.Identifier) continue;
      if (kind === SyntaxKind.CallExpression) continue;
      if (kind === SyntaxKind.AwaitExpression) continue;
      if (kind === SyntaxKind.PropertyAccessExpression) continue;
      if (kind === SyntaxKind.ElementAccessExpression) continue;
      if (kind === SyntaxKind.ConditionalExpression) continue;

      // Flag: throw 'string', throw 42, throw null, throw undefined, throw true, etc.
      const line = throwStmt.getStartLineNumber();
      const thrownText = expression.getText().slice(0, 60);

      issues.push({
        id: `${ctx.filePath}:${line}:no-throw-literal`,
        ruleId: 'no-throw-literal',
        severity: 'warn',
        message: `Throwing a literal value '${thrownText}' — throw an Error object instead for proper stack traces.`,
        filePath: ctx.filePath,
        range: {
          start: { line, column: 1 },
          end: { line: throwStmt.getEndLineNumber(), column: 1 },
        },
        suggestion: {
          summary: `Replace 'throw ${thrownText}' with 'throw new Error(${thrownText})'.`,
          details:
            'Thrown literals lose stack trace information. Use Error objects or custom Error subclasses for reliable error handling.',
        },
      });
    }

    return issues;
  },
};
