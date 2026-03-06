import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind, type IfStatement } from 'ts-morph';

/**
 * Detect unnecessary block-style early returns.
 * Pattern: if (cond) { return; } → if (cond) return;
 *
 * Only suggests when:
 * - consequent is a block with exactly one statement
 * - that statement is a ReturnStatement with no argument
 * - no comments inside the block
 */
export const earlyReturnRule: Rule = {
  id: 'early-return',
  title: 'Early Return',
  severity: 'info',
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.IfStatement) return;

      const ifStmt = node as IfStatement;

      // Skip if there's an else branch
      if (ifStmt.getElseStatement()) return;

      const consequent = ifStmt.getThenStatement();
      if (consequent.getKind() !== SyntaxKind.Block) return;

      const statements = consequent.getChildSyntaxList()?.getChildren() ?? [];
      if (statements.length !== 1) return;

      const onlyStmt = statements[0];
      if (onlyStmt.getKind() !== SyntaxKind.ReturnStatement) return;

      // Check no return argument
      const returnChildren = onlyStmt.getChildren();
      // ReturnStatement children: [ReturnKeyword, (expression)?, SemicolonToken?]
      const hasArgument = returnChildren.some(
        (c) =>
          c.getKind() !== SyntaxKind.ReturnKeyword &&
          c.getKind() !== SyntaxKind.SemicolonToken,
      );
      if (hasArgument) return;

      // Safety: skip if there are comments inside the block
      const blockText = consequent.getFullText();
      if (blockText.includes('//') || blockText.includes('/*')) return;

      const condition = ifStmt.getExpression().getText();
      const startLine = ifStmt.getStartLineNumber();
      const startCol = ifStmt.getStart() - sourceFile.getFullText().lastIndexOf('\n', ifStmt.getStart() - 1) - 1;
      const endLine = ifStmt.getEndLineNumber();

      const oldText = ifStmt.getText();
      const newText = `if (${condition}) return;`;

      issues.push({
        id: `${ctx.filePath}:${startLine}:early-return`,
        ruleId: 'early-return',
        severity: 'info',
        message: `Unnecessary block wrapper for early return — simplify to \`if (${condition}) return;\``,
        filePath: ctx.filePath,
        range: {
          start: { line: startLine, column: startCol },
          end: { line: endLine, column: 1 },
        },
        suggestion: {
          summary: 'Collapse single-statement early return into one line.',
          details: `The if-block contains only \`return;\` — the braces add unnecessary nesting. Use a single-line guard clause instead.`,
          proposedDiff: `- ${oldText.split('\n').join('\n- ')}\n+ ${newText}`,
        },
      });
    });

    return issues;
  },
};
