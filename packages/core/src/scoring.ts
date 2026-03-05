import type { Issue, AnalysisSummary, Severity } from '@inspectorepo/shared';

const PENALTY: Record<Severity, number> = {
  error: 10,
  warn: 5,
  info: 2,
};

export function computeScore(issues: Issue[]): AnalysisSummary {
  const bySeverity: Record<Severity, number> = { error: 0, warn: 0, info: 0 };

  for (const issue of issues) {
    bySeverity[issue.severity]++;
  }

  const total =
    bySeverity.error * PENALTY.error +
    bySeverity.warn * PENALTY.warn +
    bySeverity.info * PENALTY.info;

  const score = Math.max(0, 100 - total);

  return {
    totalIssues: issues.length,
    bySeverity,
    score,
  };
}
