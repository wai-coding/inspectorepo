import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind } from 'ts-morph';

export const noEmptyCatchRule: Rule = {
  id: 'no-empty-catch',
  title: 'No Empty Catch',
  severity: 'warn',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);

    for (const clause of catchClauses) {
      const block = clause.getBlock();
      const statements = block.getStatements();

      if (statements.length === 0) {
        const line = clause.getStartLineNumber();

        issues.push({
          id: `${ctx.filePath}:${line}:no-empty-catch`,
          ruleId: 'no-empty-catch',
          severity: 'warn',
          message: `Empty catch block at line ${line} silently hides errors.`,
          filePath: ctx.filePath,
          range: {
            start: { line, column: 1 },
            end: { line: block.getEndLineNumber(), column: 1 },
          },
          suggestion: {
            summary: 'Handle the error, rethrow it, or add a comment explaining why it is intentionally ignored.',
            details: 'Empty catch blocks swallow errors silently, making debugging harder.',
          },
        });
      }
    }

    return issues;
  },
};
