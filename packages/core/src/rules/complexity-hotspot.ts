import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind, type Node } from 'ts-morph';

const COMPLEXITY_THRESHOLD = 12;

function countComplexity(node: Node, depth: number): number {
  let score = 0;

  for (const child of node.getChildren()) {
    switch (child.getKind()) {
      case SyntaxKind.IfStatement:
        score += 1 + depth;
        break;
      case SyntaxKind.CaseClause:
        score += 1;
        break;
      case SyntaxKind.ConditionalExpression:
        score += 1 + depth;
        break;
      case SyntaxKind.ForStatement:
      case SyntaxKind.ForInStatement:
      case SyntaxKind.ForOfStatement:
      case SyntaxKind.WhileStatement:
      case SyntaxKind.DoStatement:
        score += 1 + depth;
        break;
      case SyntaxKind.CatchClause:
        score += 1;
        break;
      case SyntaxKind.BinaryExpression: {
        const op = child.getChildAtIndex(1)?.getKind();
        if (
          op === SyntaxKind.AmpersandAmpersandToken ||
          op === SyntaxKind.BarBarToken ||
          op === SyntaxKind.QuestionQuestionToken
        ) {
          score += 1;
        }
        break;
      }
    }

    // Increase depth for blocks nested inside control flow
    const isNesting =
      child.getKind() === SyntaxKind.IfStatement ||
      child.getKind() === SyntaxKind.ForStatement ||
      child.getKind() === SyntaxKind.ForInStatement ||
      child.getKind() === SyntaxKind.ForOfStatement ||
      child.getKind() === SyntaxKind.WhileStatement ||
      child.getKind() === SyntaxKind.DoStatement;

    score += countComplexity(child, isNesting ? depth + 1 : depth);
  }

  return score;
}

export const complexityHotspotRule: Rule = {
  id: 'complexity-hotspot',
  title: 'Complexity Hotspot',
  severity: 'warn',

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

      const score = countComplexity(body, 0);
      if (score < COMPLEXITY_THRESHOLD) continue;

      const startLine = fn.getStartLineNumber();
      const endLine = fn.getEndLineNumber();

      // Get function name if available
      let name = '(anonymous)';
      if ('getName' in fn && typeof fn.getName === 'function') {
        name = fn.getName() || '(anonymous)';
      } else {
        // Arrow function: try to get the variable name
        const parent = fn.getParent();
        if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
          const varDecl = parent;
          if ('getName' in varDecl && typeof varDecl.getName === 'function') {
            name = varDecl.getName();
          }
        }
      }

      issues.push({
        id: `${ctx.filePath}:${startLine}:complexity-hotspot`,
        ruleId: 'complexity-hotspot',
        severity: 'warn',
        message: `Function "${name}" has a complexity score of ${score} (threshold: ${COMPLEXITY_THRESHOLD}).`,
        filePath: ctx.filePath,
        range: {
          start: { line: startLine, column: 1 },
          end: { line: endLine, column: 1 },
        },
        suggestion: {
          summary: 'Consider reducing complexity.',
          details: [
            `Complexity score: ${score}.`,
            'Strategies: extract helper functions, use early returns, split into smaller components.',
          ].join(' '),
        },
      });
    }

    return issues;
  },
};
