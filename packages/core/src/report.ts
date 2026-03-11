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

const SEVERITY_COLOR: Record<Severity, string> = {
  error: '#e53e3e',
  warn: '#d69e2e',
  info: '#3182ce',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildHtmlReport(report: AnalysisReport): string {
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const issueRows = report.issues.map((issue) => {
    const color = SEVERITY_COLOR[issue.severity];
    const diff = issue.suggestion.proposedDiff ?? issue.suggestion.proposedPatch ?? '';
    const diffHtml = diff
      ? `<details><summary>Proposed fix</summary><pre><code>${escapeHtml(diff)}</code></pre></details>`
      : '';
    return `<tr>
      <td><span style="color:${color}">${SEVERITY_EMOJI[issue.severity]}</span></td>
      <td>${escapeHtml(issue.severity)}</td>
      <td>${escapeHtml(issue.ruleId)}</td>
      <td>${escapeHtml(issue.filePath)}</td>
      <td>${issue.range.start.line}</td>
      <td>${escapeHtml(issue.message)}${diffHtml}</td>
    </tr>`;
  }).join('\n');

  let packageSection = '';
  if (report.packageGroups && report.packageGroups.length > 0) {
    const pkgRows = report.packageGroups.map((pg) =>
      `<tr><td>${escapeHtml(pg.name)}</td><td><strong>${pg.score}/100</strong></td><td>${pg.issueCount}</td><td>${pg.bySeverity.error}</td><td>${pg.bySeverity.warn}</td><td>${pg.bySeverity.info}</td></tr>`,
    ).join('\n');
    packageSection = `<h2>Packages</h2>
    <table><thead><tr><th>Package</th><th>Score</th><th>Issues</th><th>Errors</th><th>Warnings</th><th>Info</th></tr></thead>
    <tbody>${pkgRows}</tbody></table>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>InspectoRepo Analysis Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; background: #1a1a2e; color: #e0e0e0; }
  h1 { color: #7c3aed; }
  h2 { color: #a78bfa; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #333; }
  th { background: #2d2d44; }
  tr:hover { background: #2d2d44; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1rem 0; }
  .summary-card { background: #2d2d44; padding: 1rem; border-radius: 8px; text-align: center; }
  .summary-card .value { font-size: 2rem; font-weight: bold; color: #7c3aed; }
  .summary-card .label { font-size: 0.875rem; color: #999; }
  details { margin-top: 0.5rem; }
  pre { background: #2d2d44; padding: 0.75rem; border-radius: 4px; overflow-x: auto; }
  code { font-size: 0.875rem; }
</style>
</head>
<body>
<h1>InspectoRepo Analysis Report</h1>
<p><strong>Generated:</strong> ${escapeHtml(now)}</p>
<p><strong>Files analyzed:</strong> ${report.meta.analyzedFilesCount}</p>
<p><strong>Directories:</strong> ${escapeHtml(report.meta.analyzedDirectories.join(', ') || 'none')}</p>

<h2>Summary</h2>
<div class="summary-grid">
  <div class="summary-card"><div class="value">${report.summary.score}/100</div><div class="label">Score</div></div>
  <div class="summary-card"><div class="value">${report.summary.totalIssues}</div><div class="label">Total Issues</div></div>
  <div class="summary-card"><div class="value" style="color:#e53e3e">${report.summary.bySeverity.error}</div><div class="label">Errors</div></div>
  <div class="summary-card"><div class="value" style="color:#d69e2e">${report.summary.bySeverity.warn}</div><div class="label">Warnings</div></div>
  <div class="summary-card"><div class="value" style="color:#3182ce">${report.summary.bySeverity.info}</div><div class="label">Info</div></div>
</div>

${packageSection}

<h2>Issues</h2>
${report.issues.length === 0 ? '<p>No issues found.</p>' : `<table>
<thead><tr><th></th><th>Severity</th><th>Rule</th><th>File</th><th>Line</th><th>Details</th></tr></thead>
<tbody>
${issueRows}
</tbody>
</table>`}
</body>
</html>`;
}
