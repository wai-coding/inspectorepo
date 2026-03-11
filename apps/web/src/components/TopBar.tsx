import { useRef } from 'react';
import type { AnalysisReport } from '@inspectorepo/shared';

interface TopBarProps {
  folderName: string | null;
  selectedDirs: string[];
  canAnalyze: boolean;
  report: AnalysisReport | null;
  onSelectFolder: () => void;
  onUploadFolder: (files: FileList) => void;
  onAnalyze: () => void;
  onExport: () => void;
}

export function TopBar({
  folderName,
  selectedDirs,
  canAnalyze,
  report,
  onSelectFolder,
  onUploadFolder,
  onAnalyze,
  onExport,
}: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const status = folderName
    ? `${folderName} — ${selectedDirs.length} dir(s) selected`
    : 'No project loaded';

  return (
    <header className="top-bar">
      <h1>InspectoRepo</h1>
      <span className="preview-badge" title="Under active development">Preview</span>
      {report && (
        <div className="top-bar-summary">
          <span className="score-badge">Score: {report.summary.score}/100</span>
          <span className="issue-count">
            {report.summary.totalIssues} issue{report.summary.totalIssues !== 1 ? 's' : ''}
          </span>
          <span className="file-count">{report.meta.analyzedFilesCount} files</span>
        </div>
      )}
      <div className="top-bar-actions">
        <button className="btn btn-primary" onClick={onSelectFolder}>
          Select Folder
        </button>
        <button className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
          Upload Folder
        </button>
        <input
          ref={inputRef}
          type="file"
          /* @ts-expect-error webkitdirectory is non-standard */
          webkitdirectory=""
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFolder(e.target.files);
            }
          }}
        />
        <button className="btn btn-accent" disabled={!canAnalyze} onClick={onAnalyze}>
          Analyze
        </button>
        {report && (
          <button className="btn btn-secondary" onClick={onExport}>
            Export .md
          </button>
        )}
      </div>
      <span className="status">{status}</span>
    </header>
  );
}
