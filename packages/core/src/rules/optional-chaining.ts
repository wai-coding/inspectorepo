import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind, type Node, type Expression } from 'ts-morph';

/**
 * Flatten a chain of && binary expressions into an array of operands.
 * Only flattens left-associative && chains.
 */
function flattenAndChain(node: Node): Expression[] {
  if (node.getKind() === SyntaxKind.BinaryExpression) {
    const children = node.getChildren();
    const op = children[1];
    if (op && op.getKind() === SyntaxKind.AmpersandAmpersandToken) {
      const left = children[0] as Expression;
      const right = children[2] as Expression;
      return [...flattenAndChain(left), right];
    }
  }
  return [node as Expression];
}

/**
 * Get the text of a property access chain: a.b.c → ['a', 'b', 'c']
 * Returns null if the expression is not a simple property access chain
 * (i.e., contains calls, element access, etc.).
 */
function getAccessChain(expr: Expression): string[] | null {
  const kind = expr.getKind();

  if (kind === SyntaxKind.Identifier) {
    return [expr.getText()];
  }

  if (kind === SyntaxKind.PropertyAccessExpression) {
    const children = expr.getChildren();
    // children: [expression, DotToken, name]
    const obj = children[0] as Expression;
    const name = children[2];
    if (!name) return null;
    const base = getAccessChain(obj);
    if (!base) return null;
    return [...base, name.getText()];
  }

  return null;
}

/**
 * Check if operands form a monotonic guard chain:
 * a, a.b, a.b.c → each extends the previous by one segment.
 */
function isMonotonicChain(operands: Expression[]): { chains: string[][]; safe: boolean } {
  const chains: string[][] = [];

  for (const op of operands) {
    const chain = getAccessChain(op);
    if (!chain) return { chains, safe: false };
    chains.push(chain);
  }

  if (chains.length < 2) return { chains, safe: false };

  // Each operand must be a prefix of the next, growing by exactly one segment
  for (let i = 1; i < chains.length; i++) {
    const prev = chains[i - 1];
    const curr = chains[i];
    if (curr.length !== prev.length + 1) return { chains, safe: false };
    for (let j = 0; j < prev.length; j++) {
      if (curr[j] !== prev[j]) return { chains, safe: false };
    }
  }

  return { chains, safe: true };
}

export const optionalChainingRule: Rule = {
  id: 'optional-chaining',
  title: 'Optional Chaining',
  severity: 'info',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;
    const reported = new Set<number>();

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.BinaryExpression) return;

      const children = node.getChildren();
      const op = children[1];
      if (!op || op.getKind() !== SyntaxKind.AmpersandAmpersandToken) return;

      // Avoid reporting inner nodes of already-reported chains
      const startPos = node.getStart();
      if (reported.has(startPos)) return;

      // Don't report if this is inside a larger && chain (parent is also &&)
      const parent = node.getParent();
      if (parent && parent.getKind() === SyntaxKind.BinaryExpression) {
        const parentChildren = parent.getChildren();
        const parentOp = parentChildren[1];
        if (parentOp && parentOp.getKind() === SyntaxKind.AmpersandAmpersandToken) {
          return; // Will be handled when we visit the parent
        }
      }

      const operands = flattenAndChain(node);
      if (operands.length < 2) return;

      const { chains, safe } = isMonotonicChain(operands);
      if (!safe || chains.length < 2) return;

      // Build the optional chaining suggestion
      const longest = chains[chains.length - 1];
      const suggested = longest[0] + longest.slice(1).map((s) => `?.${s}`).join('');

      const startLine = node.getStartLineNumber();
      const endLine = node.getEndLineNumber();
      const originalText = node.getText();

      reported.add(startPos);

      issues.push({
        id: `${ctx.filePath}:${startLine}:optional-chaining`,
        ruleId: 'optional-chaining',
        severity: 'info',
        message: `Guard chain can use optional chaining: \`${suggested}\``,
        filePath: ctx.filePath,
        range: {
          start: { line: startLine, column: 1 },
          end: { line: endLine, column: 1 },
        },
        suggestion: {
          summary: `Replace with optional chaining: \`${suggested}\``,
          details: `The expression \`${originalText}\` is a monotonic guard chain that can be simplified.`,
          proposedDiff: [
            `- ${originalText}`,
            `+ ${suggested}`,
          ].join('\n'),
        },
      });
    });

    return issues;
  },
};
