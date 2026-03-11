import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind } from 'ts-morph';

export const noDebuggerRule: Rule = {
  id: 'no-debugger',
  title: 'No Debugger',
  severity: 'warn',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    const debuggerStatements = sourceFile.getDescendantsOfKind(SyntaxKind.DebuggerStatement);

    for (const stmt of debuggerStatements) {
      const line = stmt.getStartLineNumber();
      const lineText = stmt.getText();

      issues.push({
        id: `${ctx.filePath}:${line}:no-debugger`,
        ruleId: 'no-debugger',
        severity: 'warn',
        message: `Debugger statement found at line ${line}.`,
        filePath: ctx.filePath,
        range: {
          start: { line, column: 1 },
          end: { line, column: 1 },
        },
        suggestion: {
          summary: 'Remove the debugger statement before committing or shipping.',
          details: 'Debugger statements should not be present in production code.',
          proposedDiff: `- ${lineText}`,
        },
      });
    }

    return issues;
  },
};
