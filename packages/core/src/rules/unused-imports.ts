import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';
import { Node } from 'ts-morph';

export const unusedImportsRule: Rule = {
  id: 'unused-imports',
  title: 'Unused Imports',
  severity: 'warn',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    for (const importDecl of sourceFile.getImportDeclarations()) {
      // Skip side-effect imports: import './polyfill'
      if (!importDecl.getDefaultImport() && importDecl.getNamedImports().length === 0 && !importDecl.getNamespaceImport()) {
        continue;
      }

      const unusedSpecifiers: string[] = [];
      const totalSpecifiers: string[] = [];

      // Check default import
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        totalSpecifiers.push(defaultImport.getText());
        const refs = defaultImport.findReferencesAsNodes();
        // Only the import declaration itself
        if (refs.length <= 1) {
          unusedSpecifiers.push(defaultImport.getText());
        }
      }

      // Check namespace import
      const nsImport = importDecl.getNamespaceImport();
      if (nsImport) {
        const nsName = nsImport.getText();
        totalSpecifiers.push(`* as ${nsName}`);
        const refs = nsImport.findReferencesAsNodes();
        if (refs.length <= 1) {
          unusedSpecifiers.push(`* as ${nsName}`);
        }
      }

      // Check named imports
      for (const spec of importDecl.getNamedImports()) {
        const name = spec.getName();
        totalSpecifiers.push(name);
        const nameNode = spec.getNameNode();
        if (Node.isIdentifier(nameNode)) {
          const refs = nameNode.findReferencesAsNodes();
          if (refs.length <= 1) {
            unusedSpecifiers.push(name);
          }
        }
      }

      if (unusedSpecifiers.length === 0) continue;

      const startLine = importDecl.getStartLineNumber();
      const startCol = importDecl.getStart() - sourceFile.getFullText().lastIndexOf('\n', importDecl.getStart() - 1) - 1;
      const endLine = importDecl.getEndLineNumber();

      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const removeAll = unusedSpecifiers.length === totalSpecifiers.length;

      let proposedPatch: string;
      if (removeAll) {
        proposedPatch = `- ${importDecl.getText()}`;
      } else {
        const keptSpecifiers = totalSpecifiers.filter((s) => !unusedSpecifiers.includes(s));
        proposedPatch = [
          `- ${importDecl.getText()}`,
          `+ import { ${keptSpecifiers.join(', ')} } from '${moduleSpecifier}';`,
        ].join('\n');
      }

      issues.push({
        id: `${ctx.filePath}:${startLine}:unused-imports`,
        ruleId: 'unused-imports',
        severity: 'warn',
        message: removeAll
          ? `Unused import: entire import from '${moduleSpecifier}' is unused.`
          : `Unused import specifier(s): ${unusedSpecifiers.join(', ')} from '${moduleSpecifier}'.`,
        filePath: ctx.filePath,
        range: {
          start: { line: startLine, column: Math.max(1, startCol) },
          end: { line: endLine, column: 1 },
        },
        suggestion: {
          summary: removeAll
            ? `Remove the entire import from '${moduleSpecifier}'.`
            : `Remove unused specifier(s): ${unusedSpecifiers.join(', ')}.`,
          details: removeAll
            ? 'This import is not referenced anywhere in the file.'
            : `Only ${totalSpecifiers.filter((s) => !unusedSpecifiers.includes(s)).join(', ')} are used.`,
          proposedPatch,
        },
      });
    }

    return issues;
  },
};
