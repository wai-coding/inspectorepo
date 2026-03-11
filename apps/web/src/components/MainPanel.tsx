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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!report) {
    return (
      <main className="main-panel">
        <div className="placeholder">
          <div className="about-section">
            <h2 className="about-title">About InspectoRepo</h2>
            <p className="about-text">
              InspectoRepo analyzes TypeScript and React codebases using AST-based rules to surface
              code quality improvements — with proposed fixes, severity scoring, and exportable reports.
            </p>
            <p className="about-text">
              Select a folder and click <strong>Analyze</strong> to get started.
            </p>
            <p className="about-hint">
              This UI is currently in <strong>Preview</strong> — features are under active development.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (report.issues.length === 0) {
    return (
      <main className="main-panel">
        <div className="empty-state">
          <p className="empty-title">Great! No issues detected.</p>
          <p className="empty-detail">
            Your code passed all {report.meta.analyzedFilesCount} analyzed file
            {report.meta.analyzedFilesCount !== 1 ? 's' : ''} with a perfect score
            of {report.summary.score}/100. No improvements needed right now.
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

  function handleRowClick(issue: Issue) {
    if (expandedId === issue.id) {
      setExpandedId(null);
    } else {
      setExpandedId(issue.id);
    }
    onSelectIssue(issue);
  }

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
        {filtered.map((issue) => {
          const isExpanded = expandedId === issue.id;
          return (
            <div key={issue.id} className="issue-entry">
              <button
                className={`issue-row ${selectedIssue?.id === issue.id ? 'selected' : ''} severity-row-${issue.severity}`}
                onClick={() => handleRowClick(issue)}
              >
                <span
                  className="issue-severity"
                  style={{ color: SEVERITY_COLORS[issue.severity] }}
                >
                  {SEVERITY_LABELS[issue.severity]}
                </span>
                <span className="issue-rule">{issue.ruleId}</span>
                <span className="issue-file">
                  {issue.filePath}
                  <span className="issue-line">:{issue.range.start.line}</span>
                </span>
                <span className="issue-msg">{issue.message}</span>
                <span className={`issue-chevron ${isExpanded ? 'expanded' : ''}`}>&#9654;</span>
              </button>
              {isExpanded && (
                <div className="issue-expanded">
                  <div className="issue-expanded-grid">
                    <div className="issue-expanded-label">Severity</div>
                    <div className={`issue-expanded-value severity-text-${issue.severity}`}>
                      {issue.severity.toUpperCase()}
                    </div>
                    <div className="issue-expanded-label">Rule</div>
                    <div className="issue-expanded-value">{issue.ruleId}</div>
                    <div className="issue-expanded-label">Location</div>
                    <div className="issue-expanded-value issue-expanded-location">
                      {issue.filePath}:{issue.range.start.line}:{issue.range.start.column}
                    </div>
                  </div>
                  <p className="issue-expanded-message">{issue.message}</p>
                  {issue.suggestion.summary && (
                    <div className="issue-expanded-suggestion">
                      <span className="issue-expanded-suggestion-label">Suggestion:</span>{' '}
                      {issue.suggestion.summary}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <p className="empty-detail">No issues match the current filters.</p>
          </div>
        )}
      </div>
    </main>
  );
}
