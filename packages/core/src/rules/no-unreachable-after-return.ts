import { SyntaxKind } from 'ts-morph';
import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';

export const noUnreachableAfterReturnRule: Rule = {
  id: 'no-unreachable-after-return',
  title: 'No Unreachable Code After Return',
  severity: 'warn',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    // Terminal statement kinds: return, throw, continue, break
    const terminalKinds = new Set([
      SyntaxKind.ReturnStatement,
      SyntaxKind.ThrowStatement,
      SyntaxKind.ContinueStatement,
      SyntaxKind.BreakStatement,
    ]);

    for (const block of sourceFile.getDescendantsOfKind(SyntaxKind.Block)) {
      const statements = block.getStatements();
      if (statements.length < 2) continue;

      for (let i = 0; i < statements.length - 1; i++) {
        const stmt = statements[i];
        if (!terminalKinds.has(stmt.getKind())) continue;

        // All statements after a terminal statement in the same block are unreachable
        const unreachable = statements.slice(i + 1);
        if (unreachable.length === 0) continue;

        // Skip if the unreachable code is only type/interface declarations (they don't execute)
        const executableUnreachable = unreachable.filter(
          s =>
            s.getKind() !== SyntaxKind.TypeAliasDeclaration &&
            s.getKind() !== SyntaxKind.InterfaceDeclaration,
        );
        if (executableUnreachable.length === 0) continue;

        const terminalLine = stmt.getStartLineNumber();
        const terminalKind = stmt.getKindName().replace('Statement', '').toLowerCase();
        const firstUnreachable = executableUnreachable[0];

        issues.push({
          id: `${ctx.filePath}:${firstUnreachable.getStartLineNumber()}:no-unreachable-after-return`,
          ruleId: 'no-unreachable-after-return',
          severity: 'warn',
          message: `Unreachable code after '${terminalKind}' on line ${terminalLine} — ${executableUnreachable.length} statement(s) will never execute.`,
          filePath: ctx.filePath,
          range: {
            start: { line: firstUnreachable.getStartLineNumber(), column: 1 },
            end: {
              line: executableUnreachable[executableUnreachable.length - 1].getEndLineNumber(),
              column: 1,
            },
          },
          suggestion: {
            summary: `Remove unreachable code after '${terminalKind}'.`,
            details: `${executableUnreachable.length} statement(s) after '${terminalKind}' on line ${terminalLine} can never execute.`,
          },
        });

        // Only flag first terminal per block
        break;
      }
    }

    return issues;
  },
};
