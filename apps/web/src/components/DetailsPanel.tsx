import { useState } from 'react';
import type { Issue } from '@inspectorepo/shared';

type DetailTab = 'suggestion' | 'diff';

interface DetailsPanelProps {
  issue: Issue | null;
}

export function DetailsPanel({ issue }: DetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('suggestion');

  if (!issue) {
    return (
      <aside className="details-panel">
        <h2>Details</h2>
        <div className="placeholder">
          <p>Select an issue to see details</p>
        </div>
      </aside>
    );
  }

  const diff = issue.suggestion.proposedDiff ?? issue.suggestion.proposedPatch;
  const hasDiff = !!diff;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <aside className="details-panel">
      <h2>Details</h2>
      <div className="detail-content">
        <div className="detail-header">
          <span className={`detail-severity severity-${issue.severity}`}>
            {issue.severity.toUpperCase()}
          </span>
          <span className="detail-rule">{issue.ruleId}</span>
        </div>
        <div className="detail-location">
          {issue.filePath}:{issue.range.start.line}
        </div>
        <p className="detail-message">{issue.message}</p>

        <div className="detail-tabs">
          <button
            className={`detail-tab ${activeTab === 'suggestion' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestion')}
          >
            Suggestion
          </button>
          {hasDiff && (
            <button
              className={`detail-tab ${activeTab === 'diff' ? 'active' : ''}`}
              onClick={() => setActiveTab('diff')}
            >
              Diff
            </button>
          )}
        </div>

        {activeTab === 'suggestion' && (
          <div className="detail-section">
            <p className="detail-summary">{issue.suggestion.summary}</p>
            {issue.suggestion.details && (
              <p className="detail-details">{issue.suggestion.details}</p>
            )}
            <div className="detail-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copyText(issue.suggestion.summary + '\n' + (issue.suggestion.details ?? ''))}
              >
                Copy Suggested Fix
              </button>
            </div>
          </div>
        )}

        {activeTab === 'diff' && hasDiff && (
          <div className="detail-section">
            <div className="detail-patch-header">
              <h3>Proposed Fix</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copyText(diff)}
              >
                Copy Diff
              </button>
            </div>
            <pre className="detail-patch">
              {diff}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
}
