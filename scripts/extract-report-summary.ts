import { readFileSync } from 'node:fs';
import { parseReportSummary } from '@inspectorepo/core';

const reportPath = process.argv[2] || 'inspectorepo-report.md';

let markdown: string;
try {
  markdown = readFileSync(reportPath, 'utf-8');
} catch {
  console.error(`Could not read report file: ${reportPath}`);
  process.exit(1);
}

const summary = parseReportSummary(markdown);

if (!summary) {
  // Output null so the caller can detect failure
  console.log('null');
  process.exit(0);
}

console.log(JSON.stringify({
  score: summary.score,
  totalIssues: summary.totalIssues,
  errors: summary.errors,
  warnings: summary.warnings,
  info: summary.info,
}));
