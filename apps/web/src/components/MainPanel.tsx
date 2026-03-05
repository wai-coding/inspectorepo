import { useState } from 'react';
import type { AnalysisReport, Issue, Severity } from '@inspectorepo/shared';

interface MainPanelProps {
  report: AnalysisReport | null;
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue | null) => void;
}

const SEVERITY_LABELS: Record<Severity, string> = {
  error: 'ERR',
  warn: 'WARN',
  info: 'INFO',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  error: '#f44336',
  warn: '#ff9800',
  info: '#2196f3',
};

export function MainPanel({ report, selectedIssue, onSelectIssue }: MainPanelProps) {
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [search, setSearch] = useState('');

  if (!report) {
    return (
      <main className="main-panel">
        <div className="placeholder">
          <p>Select a folder and click Analyze to start</p>
        </div>
      </main>
    );
  }

  if (report.issues.length === 0) {
    return (
      <main className="main-panel">
        <div className="empty-state">
          <p className="empty-title">No issues found</p>
          <p className="empty-detail">
            Score: {report.summary.score}/100 — Scanned {report.meta.analyzedFilesCount} file
            {report.meta.analyzedFilesCount !== 1 ? 's' : ''}.
          </p>
        </div>
      </main>
    );
  }

  const searchLower = search.toLowerCase();
  const filtered = report.issues.filter((issue) => {
    if (filter !== 'all' && issue.severity !== filter) return false;
    if (search && !issue.message.toLowerCase().includes(searchLower) && !issue.filePath.toLowerCase().includes(searchLower) && !issue.ruleId.toLowerCase().includes(searchLower)) return false;
    return true;
  });

  return (
    <main className="main-panel">
      <div className="issue-toolbar">
        <div className="severity-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({report.issues.length})
          </button>
          <button
            className={`filter-btn filter-error ${filter === 'error' ? 'active' : ''}`}
            onClick={() => setFilter('error')}
          >
            Errors ({report.summary.bySeverity.error})
          </button>
          <button
            className={`filter-btn filter-warn ${filter === 'warn' ? 'active' : ''}`}
            onClick={() => setFilter('warn')}
          >
            Warnings ({report.summary.bySeverity.warn})
          </button>
          <button
            className={`filter-btn filter-info ${filter === 'info' ? 'active' : ''}`}
            onClick={() => setFilter('info')}
          >
            Info ({report.summary.bySeverity.info})
          </button>
        </div>
        <input
          className="issue-search"
          type="text"
          placeholder="Search issues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="issue-list">
        {filtered.map((issue) => (
          <button
            key={issue.id}
            className={`issue-row ${selectedIssue?.id === issue.id ? 'selected' : ''}`}
            onClick={() => onSelectIssue(issue)}
          >
            <span
              className="issue-severity"
              style={{ color: SEVERITY_COLORS[issue.severity] }}
            >
              {SEVERITY_LABELS[issue.severity]}
            </span>
            <span className="issue-rule">{issue.ruleId}</span>
            <span className="issue-file">
              {issue.filePath}:{issue.range.start.line}
            </span>
            <span className="issue-msg">{issue.message}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            <p className="empty-detail">No issues match the current filters.</p>
          </div>
        )}
      </div>
    </main>
  );
}
