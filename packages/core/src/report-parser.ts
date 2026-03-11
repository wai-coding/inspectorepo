export interface ReportSummary {
  score: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
}

/**
 * Parse the markdown summary table produced by buildMarkdownReport().
 * Returns null if the table cannot be reliably parsed.
 */
export function parseReportSummary(markdown: string): ReportSummary | null {
  // The summary table looks like:
  // | Metric | Value |
  // |---|---|
  // | Score | **82/100** |
  // | Total issues | 5 |
  // | 🔴 Errors | 0 |
  // | 🟡 Warnings | 3 |
  // | 🔵 Info | 2 |

  const lines = markdown.split('\n');
  const tableRows = new Map<string, string>();

  for (const line of lines) {
    // Match markdown table rows: | key | value |
    const match = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/);
    if (!match) continue;
    // Strip emoji prefixes and normalize
    const key = match[1].replace(/^[\u{1F534}\u{1F7E1}\u{1F535}]\s*/u, '').trim().toLowerCase();
    const value = match[2].trim();
    tableRows.set(key, value);
  }

  // Extract score from "**82/100**" or "82/100"
  const scoreRaw = tableRows.get('score');
  if (!scoreRaw) return null;
  const scoreMatch = scoreRaw.match(/\*{0,2}(\d+)\s*\/\s*100\*{0,2}/);
  if (!scoreMatch) return null;
  const score = parseInt(scoreMatch[1], 10);

  // Extract total issues
  const totalRaw = tableRows.get('total issues');
  if (!totalRaw) return null;
  const totalIssues = parseInt(totalRaw, 10);
  if (isNaN(totalIssues)) return null;

  // Extract severity counts
  const errorsRaw = tableRows.get('errors');
  const warningsRaw = tableRows.get('warnings');
  const infoRaw = tableRows.get('info');

  if (!errorsRaw || !warningsRaw || !infoRaw) return null;

  const errors = parseInt(errorsRaw, 10);
  const warnings = parseInt(warningsRaw, 10);
  const info = parseInt(infoRaw, 10);

  if (isNaN(errors) || isNaN(warnings) || isNaN(info)) return null;

  return { score, totalIssues, errors, warnings, info };
}
