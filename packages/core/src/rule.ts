import type { Issue, Severity } from '@inspectorepo/shared';
import type { SourceFile } from 'ts-morph';

export interface RuleContext {
  sourceFile: SourceFile;
  filePath: string;
}

export interface Rule {
  id: string;
  title: string;
  severity: Severity;
  run(ctx: RuleContext): Issue[];
}
