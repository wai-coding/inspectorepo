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

// Extract package highlights from the ## Packages table
const packages: { name: string; score: number; issues: number }[] = [];
const pkgMatch = markdown.match(/## Packages\n\n\|[^\n]+\n\|[^\n]+\n([\s\S]*?)(?=\n##|\n*$)/);
if (pkgMatch) {
  for (const line of pkgMatch[1].split('\n')) {
    const m = line.match(/^\|\s*(.+?)\s*\|\s*\*\*(\d+)\/100\*\*\s*\|\s*(\d+)/);
    if (m) {
      packages.push({ name: m[1], score: parseInt(m[2], 10), issues: parseInt(m[3], 10) });
    }
  }
}

// Extract top rules from the ## Issues table
const ruleCounts: Record<string, number> = {};
const issuesMatch = markdown.match(/## Issues\n\n\|[^\n]+\n\|[^\n]+\n([\s\S]*?)(?=\n##|\n*$)/);
if (issuesMatch) {
  for (const line of issuesMatch[1].split('\n')) {
    const m = line.match(/^\|[^|]+\|[^|]+\|\s*([^\s|]+)/);
    if (m) {
      ruleCounts[m[1]] = (ruleCounts[m[1]] || 0) + 1;
    }
  }
}
const topRules = Object.entries(ruleCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([rule, count]) => ({ rule, count }));

console.log(JSON.stringify({
  score: summary.score,
  totalIssues: summary.totalIssues,
  errors: summary.errors,
  warnings: summary.warnings,
  info: summary.info,
  packages,
  topRules,
}));
