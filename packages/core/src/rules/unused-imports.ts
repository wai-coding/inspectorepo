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

      // Track categories for patch generation
      let hasDefault = false;
      let defaultUnused = false;
      let defaultName = '';

      let hasNamespace = false;
      let namespaceUnused = false;
      let namespaceName = '';

      const usedNamed: string[] = [];
      const unusedNamed: string[] = [];

      // Check default import
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        hasDefault = true;
        defaultName = defaultImport.getText();
        totalSpecifiers.push(defaultName);
        const refs = defaultImport.findReferencesAsNodes();
        if (refs.length <= 1) {
          unusedSpecifiers.push(defaultName);
          defaultUnused = true;
        }
      }

      // Check namespace import
      const nsImport = importDecl.getNamespaceImport();
      if (nsImport) {
        hasNamespace = true;
        namespaceName = nsImport.getText();
        totalSpecifiers.push(`* as ${namespaceName}`);
        const refs = nsImport.findReferencesAsNodes();
        if (refs.length <= 1) {
          unusedSpecifiers.push(`* as ${namespaceName}`);
          namespaceUnused = true;
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
            unusedNamed.push(name);
          } else {
            usedNamed.push(name);
          }
        } else {
          usedNamed.push(name);
        }
      }

      if (unusedSpecifiers.length === 0) continue;

      const startLine = importDecl.getStartLineNumber();
      const startCol = importDecl.getStart() - sourceFile.getFullText().lastIndexOf('\n', importDecl.getStart() - 1) - 1;
      const endLine = importDecl.getEndLineNumber();

      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const removeAll = unusedSpecifiers.length === totalSpecifiers.length;

      let proposedPatch: string | undefined;

      if (removeAll) {
        proposedPatch = `- ${importDecl.getText()}`;
      } else {
        // Build the replacement import preserving structure
        const keptDefault = hasDefault && !defaultUnused ? defaultName : null;
        const keptNamespace = hasNamespace && !namespaceUnused ? `* as ${namespaceName}` : null;
        const keptNamed = usedNamed;

        // If a namespace import coexists with default (unusual), or the combination
        // is complex, fall back to text-only suggestion (no patch).
        const isComplex =
          (keptDefault && keptNamespace) ||
          (keptNamespace && keptNamed.length > 0);

        if (isComplex) {
          proposedPatch = undefined; // omit — text suggestion only
        } else if (keptNamespace) {
          proposedPatch = [
            `- ${importDecl.getText()}`,
            `+ import ${keptNamespace} from '${moduleSpecifier}';`,
          ].join('\n');
        } else if (keptDefault && keptNamed.length > 0) {
          proposedPatch = [
            `- ${importDecl.getText()}`,
            `+ import ${keptDefault}, { ${keptNamed.join(', ')} } from '${moduleSpecifier}';`,
          ].join('\n');
        } else if (keptDefault) {
          proposedPatch = [
            `- ${importDecl.getText()}`,
            `+ import ${keptDefault} from '${moduleSpecifier}';`,
          ].join('\n');
        } else if (keptNamed.length > 0) {
          proposedPatch = [
            `- ${importDecl.getText()}`,
            `+ import { ${keptNamed.join(', ')} } from '${moduleSpecifier}';`,
          ].join('\n');
        }
      }

      const suggestion: Issue['suggestion'] = {
        summary: removeAll
          ? `Remove the entire import from '${moduleSpecifier}'.`
          : `Remove unused specifier(s): ${unusedSpecifiers.join(', ')}.`,
        details: removeAll
          ? 'This import is not referenced anywhere in the file.'
          : `Only ${totalSpecifiers.filter((s) => !unusedSpecifiers.includes(s)).join(', ')} are used.`,
      };
      if (proposedPatch) {
        suggestion.proposedPatch = proposedPatch;
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
        suggestion,
      });
    }

    return issues;
  },
};
