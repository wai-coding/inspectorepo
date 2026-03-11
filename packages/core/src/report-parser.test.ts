import { describe, it, expect } from 'vitest';
import { parseReportSummary } from './report-parser.js';
import { buildMarkdownReport } from './report.js';
import type { AnalysisReport } from '@inspectorepo/shared';

describe('parseReportSummary', () => {
  it('parses a normal report with issues', () => {
    const report: AnalysisReport = {
      summary: { score: 75, totalIssues: 5, bySeverity: { error: 1, warn: 2, info: 2 } },
      issues: [
        {
          id: '1', ruleId: 'unused-imports', severity: 'error',
          message: 'Unused import', filePath: 'src/a.ts',
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } },
          suggestion: { summary: 'Remove it', details: '' },
        },
        {
          id: '2', ruleId: 'complexity-hotspot', severity: 'warn',
          message: 'Too complex', filePath: 'src/a.ts',
          range: { start: { line: 5, column: 1 }, end: { line: 5, column: 10 } },
          suggestion: { summary: 'Refactor', details: '' },
        },
        {
          id: '3', ruleId: 'complexity-hotspot', severity: 'warn',
          message: 'Too complex', filePath: 'src/b.ts',
          range: { start: { line: 3, column: 1 }, end: { line: 3, column: 10 } },
          suggestion: { summary: 'Refactor', details: '' },
        },
        {
          id: '4', ruleId: 'optional-chaining', severity: 'info',
          message: 'Use ?.', filePath: 'src/a.ts',
          range: { start: { line: 10, column: 1 }, end: { line: 10, column: 10 } },
          suggestion: { summary: 'Use optional chaining', details: '' },
        },
        {
          id: '5', ruleId: 'boolean-simplification', severity: 'info',
          message: 'Simplify', filePath: 'src/b.ts',
          range: { start: { line: 7, column: 1 }, end: { line: 7, column: 10 } },
          suggestion: { summary: 'Simplify boolean', details: '' },
        },
      ],
      meta: { analyzedFilesCount: 2, analyzedDirectories: ['src'] },
    };

    const md = buildMarkdownReport(report);
    const result = parseReportSummary(md);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(75);
    expect(result!.totalIssues).toBe(5);
    expect(result!.errors).toBe(1);
    expect(result!.warnings).toBe(2);
    expect(result!.info).toBe(2);
  });

  it('parses an empty/no-issues report', () => {
    const report: AnalysisReport = {
      summary: { score: 100, totalIssues: 0, bySeverity: { error: 0, warn: 0, info: 0 } },
      issues: [],
      meta: { analyzedFilesCount: 1, analyzedDirectories: ['src'] },
    };

    const md = buildMarkdownReport(report);
    const result = parseReportSummary(md);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.totalIssues).toBe(0);
    expect(result!.errors).toBe(0);
    expect(result!.warnings).toBe(0);
    expect(result!.info).toBe(0);
  });

  it('returns null for malformed/missing table', () => {
    const malformed = '# Some Report\n\nNo table here at all.\n';
    expect(parseReportSummary(malformed)).toBeNull();
  });

  it('returns null for partial table missing severity rows', () => {
    const partial = [
      '| Metric | Value |',
      '|---|---|',
      '| Score | **50/100** |',
      '| Total issues | 3 |',
    ].join('\n');
    expect(parseReportSummary(partial)).toBeNull();
  });

  it('handles score without bold markers', () => {
    const raw = [
      '| Metric | Value |',
      '|---|---|',
      '| Score | 90/100 |',
      '| Total issues | 1 |',
      '| 🔴 Errors | 0 |',
      '| 🟡 Warnings | 1 |',
      '| 🔵 Info | 0 |',
    ].join('\n');
    const result = parseReportSummary(raw);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(90);
  });
});
