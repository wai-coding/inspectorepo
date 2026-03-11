import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind } from 'ts-morph';

export const noEmptyFunctionRule: Rule = {
  id: 'no-empty-function',
  title: 'No Empty Function',
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
      if (body.getKind() !== SyntaxKind.Block) continue;

      const statements = body.getChildSyntaxList()?.getChildren() ?? [];
      if (statements.length > 0) continue;

      // Skip functions with comments in the body (intentional stub)
      const bodyText = body.getFullText();
      if (bodyText.includes('//') || bodyText.includes('/*')) continue;

      // Get function name
      let name = '(anonymous)';
      if ('getName' in fn && typeof fn.getName === 'function') {
        name = fn.getName() || '(anonymous)';
      } else {
        const parent = fn.getParent();
        if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
          if ('getName' in parent && typeof parent.getName === 'function') {
            name = parent.getName();
          }
        }
      }

      const line = fn.getStartLineNumber();

      issues.push({
        id: `${ctx.filePath}:${line}:no-empty-function`,
        ruleId: 'no-empty-function',
        severity: 'info',
        message: `Empty function "${name}" at line ${line}.`,
        filePath: ctx.filePath,
        range: {
          start: { line, column: 1 },
          end: { line: fn.getEndLineNumber(), column: 1 },
        },
        suggestion: {
          summary: 'Implement function logic, remove it, or add a comment documenting the intentional stub.',
          details: 'Empty function bodies may indicate incomplete implementation.',
        },
      });
    }

    return issues;
  },
};
