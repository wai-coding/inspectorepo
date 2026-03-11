import type { AnalysisReport, Severity } from '@inspectorepo/shared';

const SEVERITY_EMOJI: Record<Severity, string> = {
  error: '🔴',
  warn: '🟡',
  info: '🔵',
};

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
  lines.push(`| ${SEVERITY_EMOJI.error} Errors | ${report.summary.bySeverity.error} |`);
  lines.push(`| ${SEVERITY_EMOJI.warn} Warnings | ${report.summary.bySeverity.warn} |`);
  lines.push(`| ${SEVERITY_EMOJI.info} Info | ${report.summary.bySeverity.info} |`);
  lines.push('');

  // Package group summary (monorepo analysis)
  if (report.packageGroups && report.packageGroups.length > 0) {
    lines.push('## Packages');
    lines.push('');
    lines.push('| Package | Score | Issues | Errors | Warnings | Info |');
    lines.push('|---|---|---|---|---|---|');
    for (const pg of report.packageGroups) {
      lines.push(
        `| ${pg.name} | **${pg.score}/100** | ${pg.issueCount} | ${pg.bySeverity.error} | ${pg.bySeverity.warn} | ${pg.bySeverity.info} |`,
      );
    }
    lines.push('');
  }

  if (report.issues.length === 0) {
    lines.push('No issues found.');
    return lines.join('\n');
  }

  // Issues table
  lines.push('## Issues');
  lines.push('');
  lines.push('| | Severity | Rule | File | Line |');
  lines.push('|---|---|---|---|---|');
  for (const issue of report.issues) {
    const emoji = SEVERITY_EMOJI[issue.severity];
    lines.push(
      `| ${emoji} | ${issue.severity} | ${issue.ruleId} | ${issue.filePath} | ${issue.range.start.line} |`,
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
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const emoji = SEVERITY_EMOJI[issue.severity];

      lines.push(
        `${emoji} **${issue.severity.toUpperCase()}** — \`${issue.ruleId}\` (line ${issue.range.start.line})`,
      );
      lines.push('');
      lines.push(issue.message);
      lines.push('');
      if (issue.suggestion.summary) {
        lines.push(`> 💡 ${issue.suggestion.summary}`);
        lines.push('');
      }
      const diff = issue.suggestion.proposedDiff ?? issue.suggestion.proposedPatch;
      if (diff) {
        lines.push('<details>');
        lines.push('<summary>Proposed fix</summary>');
        lines.push('');
        lines.push('```diff');
        lines.push(diff);
        lines.push('```');
        lines.push('');
        lines.push('</details>');
        lines.push('');
      }
      if (i < issues.length - 1) {
        lines.push('---');
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
