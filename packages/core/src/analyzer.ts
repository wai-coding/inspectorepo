import type { AnalysisReport, AnalysisResult } from '@inspectorepo/shared';
import type { Rule } from './rule.js';
import { placeholderRule } from './rules/index.js';
import { filterAnalyzableFiles } from './scanner.js';

export interface FileInput {
  path: string;
  content: string;
}

const defaultRules: Rule[] = [placeholderRule];

export function analyzeFiles(files: FileInput[], rules: Rule[] = defaultRules): AnalysisReport {
  const analyzable = files.filter((f) => filterAnalyzableFiles([f.path]).length > 0);

  const results: AnalysisResult[] = analyzable.map((file) => {
    const issues = rules.flatMap((rule) => rule.run(file.path, file.content));
    return {
      filePath: file.path,
      issues,
      scannedAt: new Date().toISOString(),
    };
  });

  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

  return {
    results,
    totalIssues,
    scannedFiles: results.length,
    createdAt: new Date().toISOString(),
  };
}
