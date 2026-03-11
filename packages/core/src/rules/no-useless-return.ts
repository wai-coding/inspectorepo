import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind, type Block } from 'ts-morph';

export const noUselessReturnRule: Rule = {
  id: 'no-useless-return',
  title: 'No Useless Return',
  severity: 'info',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    const functions = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
    ];

    for (const fn of functions) {
      const body = fn.getBody?.();
      if (!body) continue;
      // Only check block bodies (not expression bodies)
      if (body.getKind() !== SyntaxKind.Block) continue;

      const statements = (body as Block).getStatements();
      if (statements.length === 0) continue;

      const last = statements[statements.length - 1];

      // Only flag bare `return;` (no return value)
      if (last.getKind() !== SyntaxKind.ReturnStatement) continue;
      const returnStmt = last;
      const returnText = returnStmt.getText().trim();

      // Must be exactly "return;" — no return value
      if (returnText !== 'return;') continue;

      const line = returnStmt.getStartLineNumber();

      issues.push({
        id: `${ctx.filePath}:${line}:no-useless-return`,
        ruleId: 'no-useless-return',
        severity: 'info',
        message: `Redundant return statement at line ${line}.`,
        filePath: ctx.filePath,
        range: {
          start: { line, column: 1 },
          end: { line, column: 1 },
        },
        suggestion: {
          summary: 'Remove the redundant return statement.',
          details: 'A bare return at the end of a function body has no effect.',
          proposedDiff: `- ${returnText}`,
        },
      });
    }

    return issues;
  },
};
