import type { Issue, Severity } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';

// Conservative subset of TypeScript diagnostic codes that are high-confidence and clearly actionable
const DIAGNOSTIC_MAP: Record<number, { message: (text: string) => string; severity: Severity }> = {
  // TS7027: Unreachable code detected
  7027: {
    message: () => 'Unreachable code detected.',
    severity: 'warn',
  },
  // TS2300: Duplicate identifier
  2300: {
    message: (text) => `Duplicate identifier: ${text}`,
    severity: 'error',
  },
  // TS2304: Cannot find name
  2304: {
    message: (text) => `Cannot find name: ${text}`,
    severity: 'error',
  },
  // TS2339: Property does not exist on type
  2339: {
    message: (text) => text,
    severity: 'error',
  },
  // TS2554: Expected N arguments, but got M
  2554: {
    message: (text) => text,
    severity: 'error',
  },
  // TS2322: Type is not assignable to type
  2322: {
    message: (text) => text,
    severity: 'error',
  },
};

const KNOWN_CODES = new Set(Object.keys(DIAGNOSTIC_MAP).map(Number));

export const tsDiagnosticsRule: Rule = {
  id: 'ts-diagnostics',
  title: 'TypeScript Diagnostics',
  severity: 'error',

  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const sourceFile = ctx.sourceFile;

    // Get pre-emit diagnostics (semantic errors) from the source file
    const diagnostics = sourceFile.getPreEmitDiagnostics();

    for (const diag of diagnostics) {
      const code = diag.getCode();
      if (!KNOWN_CODES.has(code)) continue;

      const mapping = DIAGNOSTIC_MAP[code];
      const diagMessage = diag.getMessageText();
      const rawText = typeof diagMessage === 'string'
        ? diagMessage
        : diagMessage.getMessageText();

      const start = diag.getStart();
      const line = start !== undefined
        ? sourceFile.getLineAndColumnAtPos(start).line
        : 1;

      issues.push({
        id: `${ctx.filePath}:${line}:ts-diagnostics-${code}`,
        ruleId: 'ts-diagnostics',
        severity: mapping.severity,
        message: mapping.message(rawText),
        filePath: ctx.filePath,
        range: {
          start: { line, column: 1 },
          end: { line, column: 1 },
        },
        suggestion: {
          summary: `Fix TypeScript error TS${code}.`,
          details: rawText,
        },
      });
    }

    return issues;
  },
};
