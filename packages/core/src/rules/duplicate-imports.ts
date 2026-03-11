import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';

export const duplicateImportsRule: Rule = {
  id: 'duplicate-imports',
  title: 'Duplicate Imports',
  severity: 'info',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    // Group imports by module specifier
    const importsByModule = new Map<string, { line: number; text: string }[]>();

    for (const importDecl of sourceFile.getImportDeclarations()) {
      const module = importDecl.getModuleSpecifierValue();
      const entry = {
        line: importDecl.getStartLineNumber(),
        text: importDecl.getText(),
      };
      const existing = importsByModule.get(module) ?? [];
      existing.push(entry);
      importsByModule.set(module, existing);
    }

    for (const [module, imports] of importsByModule) {
      if (imports.length < 2) continue;

      const lines = imports.map(i => i.line).join(', ');

      issues.push({
        id: `${ctx.filePath}:${imports[0].line}:duplicate-imports`,
        ruleId: 'duplicate-imports',
        severity: 'info',
        message: `Multiple imports from '${module}' at lines ${lines} — consider combining them.`,
        filePath: ctx.filePath,
        range: {
          start: { line: imports[0].line, column: 1 },
          end: { line: imports[imports.length - 1].line, column: 1 },
        },
        suggestion: {
          summary: `Combine ${imports.length} imports from '${module}' into a single import statement.`,
          details: `Found ${imports.length} separate import declarations from the same module.`,
        },
      });
    }

    return issues;
  },
};
