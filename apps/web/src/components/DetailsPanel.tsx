import type { Issue } from '@inspectorepo/shared';

interface DetailsPanelProps {
  issue: Issue | null;
}

export function DetailsPanel({ issue }: DetailsPanelProps) {
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

        <div className="detail-section">
          <h3>Suggestion</h3>
          <p className="detail-summary">{issue.suggestion.summary}</p>
          {issue.suggestion.details && (
            <p className="detail-details">{issue.suggestion.details}</p>
          )}
        </div>

        {(issue.suggestion.proposedPatch || issue.suggestion.proposedDiff) && (
          <div className="detail-section">
            <div className="detail-patch-header">
              <h3>Proposed Fix</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copyText(issue.suggestion.proposedPatch || issue.suggestion.proposedDiff || '')}
              >
                Copy
              </button>
            </div>
            <pre className="detail-patch">
              {issue.suggestion.proposedPatch || issue.suggestion.proposedDiff}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
}
