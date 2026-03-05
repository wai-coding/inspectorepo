import { useRef } from 'react';

interface TopBarProps {
  folderName: string | null;
  selectedDirs: string[];
  canAnalyze: boolean;
  onSelectFolder: () => void;
  onUploadFolder: (files: FileList) => void;
  onAnalyze: () => void;
}

export function TopBar({
  folderName,
  selectedDirs,
  canAnalyze,
  onSelectFolder,
  onUploadFolder,
  onAnalyze,
}: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const status = folderName
    ? `${folderName} — ${selectedDirs.length} dir(s) selected`
    : 'No project loaded';

  return (
    <header className="top-bar">
      <h1>InspectoRepo</h1>
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
      </div>
      <span className="status">{status}</span>
    </header>
  );
}
