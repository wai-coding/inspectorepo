import type { AnalysisReport } from '@inspectorepo/shared';

interface MainPanelProps {
  report: AnalysisReport | null;
}

export function MainPanel({ report }: MainPanelProps) {
  if (!report) {
    return (
      <main className="main-panel">
        <div className="placeholder">
          <p>Select a folder and click Analyze to start</p>
        </div>
      </main>
    );
  }

  if (report.totalIssues === 0) {
    return (
      <main className="main-panel">
        <div className="empty-state">
          <p className="empty-title">No issues yet — run analysis</p>
          <p className="empty-detail">
            Scanned {report.scannedFiles} file{report.scannedFiles !== 1 ? 's' : ''}. Rule
            implementations are coming in the next milestone.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-panel">
      <div className="placeholder">
        <p>
          {report.totalIssues} issue{report.totalIssues !== 1 ? 's' : ''} found in{' '}
          {report.scannedFiles} files
        </p>
      </div>
    </main>
  );
}
