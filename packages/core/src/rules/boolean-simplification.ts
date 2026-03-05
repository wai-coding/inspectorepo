import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { SyntaxKind } from 'ts-morph';

export const booleanSimplificationRule: Rule = {
  id: 'boolean-simplification',
  title: 'Boolean Simplification',
  severity: 'info',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    sourceFile.forEachDescendant((node) => {
      const kind = node.getKind();

      // Detect x === true / x === false / x !== true / x !== false
      if (kind === SyntaxKind.BinaryExpression) {
        const children = node.getChildren();
        if (children.length < 3) return;
        const left = children[0];
        const op = children[1];
        const right = children[2];
        const opKind = op.getKind();

        const isStrictEq = opKind === SyntaxKind.EqualsEqualsEqualsToken;
        const isStrictNeq = opKind === SyntaxKind.ExclamationEqualsEqualsToken;
        if (!isStrictEq && !isStrictNeq) return;

        const leftText = left.getText();
        const rightText = right.getText();

        let suggestion: string | null = null;
        let simplifiedText: string | null = null;

        if (rightText === 'true') {
          simplifiedText = isStrictEq ? leftText : `!${leftText}`;
          suggestion = isStrictEq
            ? `Simplify \`${node.getText()}\` to \`${leftText}\`.`
            : `Simplify \`${node.getText()}\` to \`!${leftText}\`.`;
        } else if (rightText === 'false') {
          simplifiedText = isStrictEq ? `!${leftText}` : leftText;
          suggestion = isStrictEq
            ? `Simplify \`${node.getText()}\` to \`!${leftText}\`.`
            : `Simplify \`${node.getText()}\` to \`${leftText}\`.`;
        } else if (leftText === 'true') {
          simplifiedText = isStrictEq ? rightText : `!${rightText}`;
          suggestion = isStrictEq
            ? `Simplify \`${node.getText()}\` to \`${rightText}\`.`
            : `Simplify \`${node.getText()}\` to \`!${rightText}\`.`;
        } else if (leftText === 'false') {
          simplifiedText = isStrictEq ? `!${rightText}` : rightText;
          suggestion = isStrictEq
            ? `Simplify \`${node.getText()}\` to \`!${rightText}\`.`
            : `Simplify \`${node.getText()}\` to \`${rightText}\`.`;
        }

        if (suggestion && simplifiedText) {
          const startLine = node.getStartLineNumber();
          issues.push({
            id: `${ctx.filePath}:${startLine}:${node.getStart()}:boolean-simplification`,
            ruleId: 'boolean-simplification',
            severity: 'info',
            message: suggestion,
            filePath: ctx.filePath,
            range: {
              start: { line: startLine, column: 1 },
              end: { line: node.getEndLineNumber(), column: 1 },
            },
            suggestion: {
              summary: suggestion,
              details: 'Comparing to boolean literals is redundant when the value is already boolean.',
              proposedPatch: [
                `- ${node.getText()}`,
                `+ ${simplifiedText}`,
              ].join('\n'),
            },
          });
        }
      }

      // Detect !!x (double negation)
      if (kind === SyntaxKind.PrefixUnaryExpression) {
        const children = node.getChildren();
        if (children.length < 2) return;
        if (children[0].getKind() !== SyntaxKind.ExclamationToken) return;

        const operand = children[1];
        if (operand.getKind() !== SyntaxKind.PrefixUnaryExpression) return;
        const innerChildren = operand.getChildren();
        if (innerChildren.length < 2) return;
        if (innerChildren[0].getKind() !== SyntaxKind.ExclamationToken) return;

        const innerExpr = innerChildren[1];
        const innerText = innerExpr.getText();
        const startLine = node.getStartLineNumber();

        issues.push({
          id: `${ctx.filePath}:${startLine}:${node.getStart()}:boolean-simplification`,
          ruleId: 'boolean-simplification',
          severity: 'info',
          message: `Double negation \`!!${innerText}\` can be simplified to \`Boolean(${innerText})\`.`,
          filePath: ctx.filePath,
          range: {
            start: { line: startLine, column: 1 },
            end: { line: node.getEndLineNumber(), column: 1 },
          },
          suggestion: {
            summary: `Replace \`!!${innerText}\` with \`Boolean(${innerText})\` for clarity.`,
            details: 'Double negation coerces to boolean but `Boolean()` is more explicit.',
            proposedPatch: [
              `- !!${innerText}`,
              `+ Boolean(${innerText})`,
            ].join('\n'),
          },
        });
      }

      // Detect x ? true : false / x ? false : true
      if (kind === SyntaxKind.ConditionalExpression) {
        const children = node.getChildren();
        // children: [condition, ?, whenTrue, :, whenFalse]
        if (children.length < 5) return;
        const whenTrue = children[2];
        const whenFalse = children[4];
        const condition = children[0];

        const trueText = whenTrue.getText().trim();
        const falseText = whenFalse.getText().trim();
        const condText = condition.getText();

        let simplified: string | null = null;
        if (trueText === 'true' && falseText === 'false') {
          simplified = condText;
        } else if (trueText === 'false' && falseText === 'true') {
          simplified = `!${condText}`;
        }

        if (simplified) {
          const startLine = node.getStartLineNumber();
          issues.push({
            id: `${ctx.filePath}:${startLine}:${node.getStart()}:boolean-simplification`,
            ruleId: 'boolean-simplification',
            severity: 'info',
            message: `Ternary \`${node.getText()}\` can be simplified to \`${simplified}\`.`,
            filePath: ctx.filePath,
            range: {
              start: { line: startLine, column: 1 },
              end: { line: node.getEndLineNumber(), column: 1 },
            },
            suggestion: {
              summary: `Simplify ternary to \`${simplified}\`.`,
              details: 'A ternary that returns boolean literals can be replaced by the condition itself.',
              proposedPatch: [
                `- ${node.getText()}`,
                `+ ${simplified}`,
              ].join('\n'),
            },
          });
        }
      }
    });

    return issues;
  },
};
