import { defineRule, analyzeCodebase } from '@inspectorepo/core';
import type { VirtualFile } from '@inspectorepo/shared';
import { SyntaxKind } from 'ts-morph';

/**
 * Example: custom rule that flags magic numbers (numeric literals > 1 outside const declarations).
 * Demonstrates the custom rule API for project-specific checks.
 */
const noMagicNumbers = defineRule({
  id: 'no-magic-numbers',
  title: 'No Magic Numbers',
  severity: 'warn',
  run(ctx) {
    const issues = [];
    const nums = ctx.sourceFile.getDescendantsOfKind(SyntaxKind.NumericLiteral);
    for (const num of nums) {
      const value = Number(num.getLiteralText());
      if (value <= 1) continue;
      // Allow in const variable declarations
      const parent = num.getParent();
      if (parent?.getKind() === SyntaxKind.VariableDeclaration) {
        const declList = parent.getParent();
        if (declList?.getText().startsWith('const')) continue;
      }
      issues.push({
        id: `${ctx.filePath}:${num.getStartLineNumber()}:no-magic-numbers`,
        ruleId: 'no-magic-numbers',
        severity: 'warn' as const,
        message: `Magic number ${value} — consider extracting to a named constant`,
        filePath: ctx.filePath,
        range: {
          start: { line: num.getStartLineNumber(), column: 1 },
          end: { line: num.getStartLineNumber(), column: 1 },
        },
        suggestion: {
          summary: `Extract ${value} into a named constant`,
          details: '',
        },
      });
    }
    return issues;
  },
});

// Usage example
const files: VirtualFile[] = [
  {
    path: 'src/example.ts',
    content: `
let timeout = 3000;
const MAX_RETRIES = 5;
function retry() { for (let i = 0; i < 10; i++) {} }
`,
  },
];

const report = analyzeCodebase({
  files,
  selectedDirectories: ['src'],
  options: { customRules: [noMagicNumbers] },
});

console.log(`Found ${report.issues.length} issue(s):`);
for (const issue of report.issues) {
  console.log(`  [${issue.severity}] ${issue.ruleId}: ${issue.message}`);
}
