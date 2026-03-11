import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind, type Node } from 'ts-morph';

const COMPLEXITY_THRESHOLD = 12;

interface ComplexityBreakdown {
  score: number;
  ifStatements: number;
  loops: number;
  ternaries: number;
  logicalChains: number;
  switchCases: number;
  catchClauses: number;
  maxNestingDepth: number;
}

function countComplexity(node: Node, depth: number, breakdown: ComplexityBreakdown): number {
  let score = 0;

  for (const child of node.getChildren()) {
    switch (child.getKind()) {
      case SyntaxKind.IfStatement:
        score += 1 + depth;
        breakdown.ifStatements++;
        break;
      case SyntaxKind.CaseClause:
        score += 1;
        breakdown.switchCases++;
        break;
      case SyntaxKind.ConditionalExpression:
        score += 1 + depth;
        breakdown.ternaries++;
        break;
      case SyntaxKind.ForStatement:
      case SyntaxKind.ForInStatement:
      case SyntaxKind.ForOfStatement:
      case SyntaxKind.WhileStatement:
      case SyntaxKind.DoStatement:
        score += 1 + depth;
        breakdown.loops++;
        break;
      case SyntaxKind.CatchClause:
        score += 1;
        breakdown.catchClauses++;
        break;
      case SyntaxKind.BinaryExpression: {
        const op = child.getChildAtIndex(1)?.getKind();
        if (
          op === SyntaxKind.AmpersandAmpersandToken ||
          op === SyntaxKind.BarBarToken ||
          op === SyntaxKind.QuestionQuestionToken
        ) {
          score += 1;
          breakdown.logicalChains++;
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

    const nextDepth = isNesting ? depth + 1 : depth;
    if (nextDepth > breakdown.maxNestingDepth) {
      breakdown.maxNestingDepth = nextDepth;
    }

    score += countComplexity(child, nextDepth, breakdown);
  }

  return score;
}

function makeEmptyBreakdown(): ComplexityBreakdown {
  return {
    score: 0,
    ifStatements: 0,
    loops: 0,
    ternaries: 0,
    logicalChains: 0,
    switchCases: 0,
    catchClauses: 0,
    maxNestingDepth: 0,
  };
}

function describeContributors(b: ComplexityBreakdown): string {
  const parts: string[] = [];
  if (b.ifStatements > 0) parts.push(`${b.ifStatements} if statement${b.ifStatements > 1 ? 's' : ''}`);
  if (b.loops > 0) parts.push(`${b.loops} loop${b.loops > 1 ? 's' : ''}`);
  if (b.ternaries > 0) parts.push(`${b.ternaries} ternary expression${b.ternaries > 1 ? 's' : ''}`);
  if (b.logicalChains > 0) parts.push(`${b.logicalChains} logical chain${b.logicalChains > 1 ? 's' : ''}`);
  if (b.switchCases > 0) parts.push(`${b.switchCases} switch case${b.switchCases > 1 ? 's' : ''}`);
  if (b.catchClauses > 0) parts.push(`${b.catchClauses} catch clause${b.catchClauses > 1 ? 's' : ''}`);
  return parts.join(', ');
}

function topContributorLabels(b: ComplexityBreakdown): string[] {
  const items: { label: string; count: number }[] = [];
  if (b.ifStatements > 0) items.push({ label: 'nested conditionals', count: b.ifStatements });
  if (b.loops > 0) items.push({ label: 'loops', count: b.loops });
  if (b.ternaries > 0) items.push({ label: 'ternaries', count: b.ternaries });
  if (b.logicalChains > 0) items.push({ label: 'logical chains', count: b.logicalChains });
  if (b.switchCases > 0) items.push({ label: 'switch/case branches', count: b.switchCases });
  items.sort((a, c) => c.count - a.count);
  return items.slice(0, 3).map(i => i.label);
}

function buildSuggestion(b: ComplexityBreakdown): string {
  const top = topContributorLabels(b);
  const tips: string[] = [];

  if (top.includes('nested conditionals') || top.includes('ternaries')) {
    tips.push('replace nested conditionals with early returns');
  }
  if (top.includes('loops')) {
    tips.push('extract loop bodies into helper functions');
  }
  if (top.includes('logical chains')) {
    tips.push('extract complex boolean conditions into named variables');
  }
  if (top.includes('switch/case branches')) {
    tips.push('consider a lookup map or strategy pattern instead of switch');
  }
  if (b.maxNestingDepth >= 3) {
    tips.push('split deeply nested logic into smaller functions');
  }
  if (tips.length === 0) {
    tips.push('extract helper functions to reduce complexity');
  }

  return `Consider: ${tips.join('; ')}.`;
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

      const breakdown = makeEmptyBreakdown();
      const score = countComplexity(body, 0, breakdown);
      breakdown.score = score;
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

      const topLabels = topContributorLabels(breakdown);
      const driverPhrase = topLabels.length > 0
        ? ` driven by ${topLabels.join(' and ')}`
        : '';

      const contributors = describeContributors(breakdown);
      const nestingNote = breakdown.maxNestingDepth >= 2
        ? `, nesting depth ${breakdown.maxNestingDepth}`
        : '';

      issues.push({
        id: `${ctx.filePath}:${startLine}:complexity-hotspot`,
        ruleId: 'complexity-hotspot',
        severity: 'warn',
        message: `Function "${name}" has high complexity (${score})${driverPhrase}.`,
        filePath: ctx.filePath,
        range: {
          start: { line: startLine, column: 1 },
          end: { line: endLine, column: 1 },
        },
        suggestion: {
          summary: buildSuggestion(breakdown),
          details: `Complexity score: ${score} (threshold: ${COMPLEXITY_THRESHOLD}). Contributors: ${contributors}${nestingNote}.`,
        },
      });
    }

    return issues;
  },
};
