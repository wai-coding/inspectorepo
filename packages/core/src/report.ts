import type { AnalysisReport } from '@inspectorepo/shared';

export function buildMarkdownReport(report: AnalysisReport): string {
  const lines: string[] = [];
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  lines.push('# InspectoRepo Analysis Report');
  lines.push('');
  lines.push(`**Generated:** ${now}`);
  lines.push(`**Files analyzed:** ${report.meta.analyzedFilesCount}`);
  lines.push(`**Directories:** ${report.meta.analyzedDirectories.join(', ') || 'none'}`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Score | **${report.summary.score}/100** |`);
  lines.push(`| Total issues | ${report.summary.totalIssues} |`);
  lines.push(`| Errors | ${report.summary.bySeverity.error} |`);
  lines.push(`| Warnings | ${report.summary.bySeverity.warn} |`);
  lines.push(`| Info | ${report.summary.bySeverity.info} |`);
  lines.push('');

  if (report.issues.length === 0) {
    lines.push('No issues found.');
    return lines.join('\n');
  }

  // Issues table
  lines.push('## Issues');
  lines.push('');
  lines.push('| Severity | Rule | File | Line |');
  lines.push('|---|---|---|---|');
  for (const issue of report.issues) {
    lines.push(
      `| ${issue.severity} | ${issue.ruleId} | ${issue.filePath} | ${issue.range.start.line} |`,
    );
  }
  lines.push('');

  // Group by file
  const byFile = new Map<string, typeof report.issues>();
  for (const issue of report.issues) {
    const arr = byFile.get(issue.filePath) ?? [];
    arr.push(issue);
    byFile.set(issue.filePath, arr);
  }

  lines.push('## Details');
  lines.push('');

  for (const [filePath, issues] of byFile) {
    lines.push(`### ${filePath}`);
    lines.push('');
    for (const issue of issues) {
      lines.push(
        `**${issue.severity.toUpperCase()}** — ${issue.ruleId} (line ${issue.range.start.line})`,
      );
      lines.push('');
      lines.push(issue.message);
      lines.push('');
      if (issue.suggestion.summary) {
        lines.push(`> ${issue.suggestion.summary}`);
        lines.push('');
      }
      if (issue.suggestion.proposedPatch) {
        lines.push('```diff');
        lines.push(issue.suggestion.proposedPatch);
        lines.push('```');
        lines.push('');
      } else if (issue.suggestion.proposedDiff) {
        lines.push('```diff');
        lines.push(issue.suggestion.proposedDiff);
        lines.push('```');
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
